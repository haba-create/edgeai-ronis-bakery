import { getDb } from './db';
import expandedData from '../data/products-expanded.json';

// Create new table for multi-supplier product pricing
async function createSupplierProductPricing(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_product_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quality_score DECIMAL(3,1),
      is_preferred BOOLEAN DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      UNIQUE(product_id, supplier_id)
    )
  `);
  
  // Add indexes for performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_supplier_pricing_product ON supplier_product_pricing(product_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_pricing_supplier ON supplier_product_pricing(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_pricing_price ON supplier_product_pricing(price);
  `);
}

// Create automatic ordering configuration table
async function createAutoOrderingConfig(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS auto_ordering_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      strategy VARCHAR(50) DEFAULT 'lowest_price', -- lowest_price, best_quality, balanced
      min_quality_score DECIMAL(3,1) DEFAULT 8.0,
      max_price_increase_percent DECIMAL(5,2) DEFAULT 10.0,
      group_orders_by_supplier BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(tenant_id, product_id)
    )
  `);
}

// Create email notification preferences table
async function createEmailNotificationPrefs(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS email_notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      notification_type VARCHAR(50) NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      email_override VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, notification_type)
    )
  `);
  
  // Create email log table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email VARCHAR(255) NOT NULL,
      sender_email VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      template_name VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      mcp_message_id VARCHAR(255),
      error_message TEXT,
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function expandDatabase() {
  const db = await getDb();
  
  try {
    console.log('Starting database expansion...');
    
    // Create new tables
    await createSupplierProductPricing(db);
    await createAutoOrderingConfig(db);
    await createEmailNotificationPrefs(db);
    
    // Get tenant ID
    const tenant = await db.get('SELECT id FROM tenants WHERE slug = ?', ['ronis-bakery']);
    if (!tenant) {
      throw new Error('Default tenant not found');
    }
    const tenantId = tenant.id;
    
    // Insert new suppliers
    console.log('Adding new suppliers...');
    const supplierIdMapping: { [key: number]: number } = {};
    
    // First, get existing supplier mappings
    const existingSuppliers = await db.all('SELECT id, name FROM suppliers');
    
    for (const supplier of expandedData.newSuppliers) {
      const result = await db.run(
        `INSERT INTO suppliers (name, contact, lead_time, mcp_id, email, phone, address, 
                               kosher_certified, delivery_schedule, minimum_order, is_global) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplier.name,
          supplier.contact,
          supplier.lead_time,
          supplier.mcp_id,
          supplier.email,
          supplier.phone,
          supplier.address,
          supplier.kosher_certified,
          supplier.delivery_schedule,
          supplier.minimum_order,
          1 // is_global
        ]
      );
      
      supplierIdMapping[supplier.id] = result.lastID!;
      
      // Create tenant-supplier relationship
      await db.run(
        `INSERT INTO tenant_suppliers (tenant_id, supplier_id, is_active, payment_terms, discount_percentage)
         VALUES (?, ?, ?, ?, ?)`,
        [tenantId, result.lastID, 1, 'Net 30', 5.0]
      );
    }
    
    console.log(`Added ${expandedData.newSuppliers.length} new suppliers`);
    
    // Insert new products with multi-supplier pricing
    console.log('Adding new products with competitive pricing...');
    
    for (const product of expandedData.newProducts) {
      // Insert the product
      const result = await db.run(
        `INSERT INTO products (tenant_id, name, category, current_stock, unit, reorder_point, 
                              optimal_stock, supplier_id, consumption_rate, daily_usage, 
                              order_quantity, lead_time, lead_time_unit, kosher_certified, 
                              storage_temp, shelf_life_days, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          product.name,
          product.category,
          0, // Start with 0 stock for new products
          product.unit,
          product.reorder_point,
          product.optimal_stock,
          supplierIdMapping[product.suppliers[0].supplier_id] || product.suppliers[0].supplier_id, // Primary supplier
          product.consumption_rate,
          product.daily_usage,
          product.order_quantity,
          product.lead_time,
          product.lead_time_unit,
          product.kosher_certified,
          product.storage_temp,
          product.shelf_life_days,
          product.suppliers[0].price // Default price from first supplier
        ]
      );
      
      const productId = result.lastID!;
      
      // Insert pricing for all suppliers
      for (const supplierPrice of product.suppliers) {
        const mappedSupplierId = supplierIdMapping[supplierPrice.supplier_id] || supplierPrice.supplier_id;
        
        await db.run(
          `INSERT INTO supplier_product_pricing (product_id, supplier_id, price, quality_score, is_preferred)
           VALUES (?, ?, ?, ?, ?)`,
          [
            productId,
            mappedSupplierId,
            supplierPrice.price,
            supplierPrice.quality_score,
            supplierPrice === product.suppliers[0] ? 1 : 0 // First supplier is preferred
          ]
        );
      }
      
      // Create auto-ordering configuration
      await db.run(
        `INSERT INTO auto_ordering_config (tenant_id, product_id, enabled, strategy)
         VALUES (?, ?, ?, ?)`,
        [tenantId, productId, 1, 'lowest_price']
      );
    }
    
    console.log(`Added ${expandedData.newProducts.length} new products with multi-supplier pricing`);
    
    // Update existing products to have supplier pricing entries
    console.log('Updating existing products with supplier pricing...');
    
    const existingProducts = await db.all(
      'SELECT id, supplier_id, price FROM products WHERE tenant_id = ?',
      [tenantId]
    );
    
    for (const product of existingProducts) {
      // Check if pricing already exists
      const existingPricing = await db.get(
        'SELECT id FROM supplier_product_pricing WHERE product_id = ? AND supplier_id = ?',
        [product.id, product.supplier_id]
      );
      
      if (!existingPricing) {
        await db.run(
          `INSERT INTO supplier_product_pricing (product_id, supplier_id, price, quality_score, is_preferred)
           VALUES (?, ?, ?, ?, ?)`,
          [product.id, product.supplier_id, product.price, 8.5, 1]
        );
      }
    }
    
    // Set up default email notification preferences for existing users
    console.log('Setting up email notification preferences...');
    
    const users = await db.all('SELECT id, role FROM users');
    const notificationTypes = [
      'order_confirmation',
      'delivery_update',
      'low_stock_alert',
      'price_change',
      'new_product',
      'weekly_summary',
      'invoice_reminder',
      'quality_issue'
    ];
    
    for (const user of users) {
      for (const notificationType of notificationTypes) {
        // Enable relevant notifications based on role
        let enabled = false;
        
        if (user.role === 'admin' || user.role === 'owner') {
          enabled = true; // Owners get all notifications
        } else if (user.role === 'supplier' && ['order_confirmation', 'quality_issue'].includes(notificationType)) {
          enabled = true;
        } else if (user.role === 'driver' && notificationType === 'delivery_update') {
          enabled = true;
        }
        
        await db.run(
          `INSERT OR IGNORE INTO email_notification_preferences (user_id, notification_type, enabled)
           VALUES (?, ?, ?)`,
          [user.id, notificationType, enabled ? 1 : 0]
        );
      }
    }
    
    console.log('Database expansion completed successfully!');
    
    // Display summary
    const supplierCount = await db.get('SELECT COUNT(*) as count FROM suppliers');
    const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE tenant_id = ?', [tenantId]);
    const pricingCount = await db.get('SELECT COUNT(*) as count FROM supplier_product_pricing');
    
    console.log('\n=== Database Expansion Summary ===');
    console.log(`Total Suppliers: ${supplierCount.count}`);
    console.log(`Total Products: ${productCount.count}`);
    console.log(`Total Pricing Entries: ${pricingCount.count}`);
    console.log(`Average suppliers per product: ${(pricingCount.count / productCount.count).toFixed(1)}`);
    
  } catch (error) {
    console.error('Error expanding database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  expandDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}