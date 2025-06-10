const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Simple test of the get_my_deliveries function logic
async function testGetMyDeliveries() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'ronis_bakery.db');
    const db = new sqlite3.Database(dbPath);
    
    const userId = '1000'; // Driver user ID
    
    console.log('Testing get_my_deliveries function...');
    console.log('Driver User ID:', userId);
    
    // Step 1: Get user info
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Error getting user:', err);
        return reject(err);
      }
      
      console.log('User found:', user);
      
      if (!user) {
        console.log('❌ User not found');
        return resolve();
      }
      
      // Step 2: Get driver record
      db.get(
        'SELECT * FROM delivery_drivers WHERE email = ? OR phone = ?',
        [user.email, user.phone],
        (err, driver) => {
          if (err) {
            console.error('Error getting driver:', err);
            return reject(err);
          }
          
          console.log('Driver found:', driver);
          
          if (!driver) {
            console.log('❌ Driver record not found');
            return resolve();
          }
          
          // Step 3: Get deliveries
          const query = `
            SELECT 
              dt.*,
              po.total_cost as order_value,
              po.status as order_status,
              t.name as tenant_name,
              t.address as delivery_address
            FROM delivery_tracking dt
            LEFT JOIN purchase_orders po ON dt.order_id = po.id
            LEFT JOIN tenants t ON po.tenant_id = t.id
            WHERE dt.driver_id = ?
            ORDER BY dt.created_at DESC
          `;
          
          db.all(query, [driver.id], (err, deliveries) => {
            if (err) {
              console.error('Error getting deliveries:', err);
              return reject(err);
            }
            
            console.log('\\n=== Deliveries Found ===');
            console.log('Total deliveries:', deliveries.length);
            
            const activeDeliveries = deliveries.filter(d => 
              ['assigned', 'pickup', 'in_transit'].includes(d.status)
            );
            
            console.log('Active deliveries:', activeDeliveries.length);
            
            deliveries.forEach((d, idx) => {
              console.log(`${idx + 1}. ID: ${d.id}, Status: ${d.status}, Tenant: ${d.tenant_name}, Value: £${d.order_value}`);
            });
            
            // Simulate the function result
            const result = {
              deliveries: deliveries.map((d) => ({
                id: d.id,
                status: d.status,
                tenant_name: d.tenant_name,
                delivery_address: d.delivery_address,
                order_value: d.order_value,
                estimated_arrival: d.estimated_arrival,
                estimated_earnings: 5.0 + (d.order_value * 0.1)
              })),
              total_count: deliveries.length,
              active_count: activeDeliveries.length
            };
            
            console.log('\\n=== Function Result ===');
            console.log('Total count:', result.total_count);
            console.log('Active count:', result.active_count);
            
            if (result.active_count > 0) {
              console.log('✅ SUCCESS: Function should return deliveries');
            } else {
              console.log('❌ ISSUE: No active deliveries found');
            }
            
            db.close();
            resolve();
          });
        }
      );
    });
  });
}

testGetMyDeliveries().catch(console.error);