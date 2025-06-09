const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ronis_bakery.db');
const db = new sqlite3.Database(dbPath);

async function createDriverTestData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Start transaction
      db.run('BEGIN TRANSACTION');
      
      try {
        // 1. First create a test client user for deliveries
        db.run(`
          INSERT OR IGNORE INTO users (id, email, password_hash, role, tenant_id, created_at)
          VALUES (998, 'client@ronis.com', '$2a$10$8Kz8YzEj8n0GHG2VVzV6PuLXBwQGQv9d3k/3mHmLXBQK5jK5jK5jK', 'client', 1, datetime('now'))
        `);
        
        // 2. Create a test driver user
        db.run(`
          INSERT OR IGNORE INTO users (id, email, password_hash, role, tenant_id, created_at)
          VALUES (999, 'driver@ronis.com', '$2a$10$8Kz8YzEj8n0GHG2VVzV6PuLXBwQGQv9d3k/3mHmLXBQK5jK5jK5jK', 'driver', 1, datetime('now'))
        `);
        
        // 3. Create a delivery driver record
        db.run(`
          INSERT OR REPLACE INTO delivery_drivers (
            id, name, email, phone, vehicle_registration, license_number, 
            is_global, is_active, created_at
          ) VALUES (
            1, 'John Driver', 'driver@ronis.com', '+447900123456', 
            'VAN-123', 'DL123456', 1, 1, datetime('now')
          )
        `);
        
        // 4. Create delivery addresses for the client
        db.run(`
          INSERT OR REPLACE INTO client_addresses (
            id, user_id, address_label, street_address, city, postcode,
            latitude, longitude, delivery_instructions, is_default
          ) VALUES 
            (1, 998, 'Home', '123 Baker Street', 'London', 'NW1 6XE', 51.5237, -0.1583, 'Ring doorbell twice', 1),
            (2, 998, 'Office', '456 Oxford Street', 'London', 'W1A 1AB', 51.5155, -0.1410, 'Leave with concierge', 0),
            (3, 998, 'Friend', '789 Regent Street', 'London', 'W1B 5AH', 51.5099, -0.1337, 'Call on arrival', 0)
        `);
        
        // 5. Create some purchase orders that need delivery
        const orderIds = [1001, 1002, 1003, 1004, 1005];
        orderIds.forEach((orderId, index) => {
          db.run(`
            INSERT OR REPLACE INTO purchase_orders (
              id, tenant_id, supplier_id, order_date, total_cost, status, 
              expected_delivery, created_at
            ) VALUES (
              ?, 1, 1, date('now'), ?, 'pending_delivery', 
              datetime('now', '+${index + 1} hours'), datetime('now')
            )
          `, [orderId, 50 + (index * 10)]);
        });
        
        // 6. Create client orders for delivery
        const clientOrderData = [
          { id: 2001, orderNum: 'CO-001', addressId: 1, amount: 25.50 },
          { id: 2002, orderNum: 'CO-002', addressId: 2, amount: 30.75 },
          { id: 2003, orderNum: 'CO-003', addressId: 3, amount: 28.00 }
        ];
        
        clientOrderData.forEach((order, index) => {
          db.run(`
            INSERT OR REPLACE INTO client_orders (
              id, tenant_id, user_id, order_number, total_amount, status,
              delivery_address_id, estimated_delivery, created_at
            ) VALUES (
              ?, 1, 998, ?, ?, 'pending', ?,
              datetime('now', '+${index + 2} hours'), datetime('now')
            )
          `, [order.id, order.orderNum, order.amount, order.addressId]);
        });
        
        // 7. Create delivery tracking records after a short delay to ensure orders exist
        setTimeout(() => {
          // Active deliveries (assigned, pickup, in_transit)
          db.run(`
            INSERT OR REPLACE INTO delivery_tracking (
              id, order_id, driver_id, status,
              estimated_arrival,
              current_latitude, current_longitude, created_at
            ) VALUES 
              (1, 1001, 1, 'assigned', datetime('now', '+1 hour'), 51.5074, -0.1278, datetime('now')),
              (2, 1002, 1, 'pickup', datetime('now', '+90 minutes'), 51.5100, -0.1300, datetime('now', '-10 minutes')),
              (3, 1003, 1, 'in_transit', datetime('now', '+30 minutes'), 51.5150, -0.1400, datetime('now', '-30 minutes'))
          `);
          
          // Completed deliveries for today
          db.run(`
            INSERT OR REPLACE INTO delivery_tracking (
              id, order_id, driver_id, status,
              estimated_arrival,
              actual_departure, actual_arrival,
              created_at
            ) VALUES 
              (4, 1004, 1, 'delivered', datetime('now', '-2 hours'), 
               datetime('now', '-3 hours'), datetime('now', '-2 hours'), datetime('now', '-4 hours')),
              (5, 1005, 1, 'delivered', datetime('now', '-4 hours'),
               datetime('now', '-5 hours'), datetime('now', '-4 hours'), datetime('now', '-6 hours'))
          `);
          
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction:', err);
              db.run('ROLLBACK');
              reject(err);
            } else {
              console.log('Driver test data created successfully!');
              
              // Verify the data
              db.get('SELECT COUNT(*) as count FROM delivery_tracking WHERE driver_id = 1', (err, row) => {
                if (!err && row) {
                  console.log('Total deliveries for driver 1:', row.count);
                }
              });
              
              db.get('SELECT COUNT(*) as count FROM delivery_tracking WHERE driver_id = 1 AND status IN ("assigned", "pickup", "in_transit")', (err, row) => {
                if (!err && row) {
                  console.log('Active deliveries for driver 1:', row.count);
                }
              });
              
              db.get('SELECT COUNT(*) as count FROM delivery_tracking WHERE driver_id = 1 AND status = "delivered"', (err, row) => {
                if (!err && row) {
                  console.log('Completed deliveries for driver 1:', row.count);
                }
              });
              
              resolve();
            }
          });
        }, 100);
        
      } catch (error) {
        console.error('Error:', error);
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

createDriverTestData()
  .then(() => {
    console.log('Test data creation completed');
    setTimeout(() => {
      db.close();
      process.exit(0);
    }, 500);
  })
  .catch((error) => {
    console.error('Failed to create test data:', error);
    db.close();
    process.exit(1);
  });