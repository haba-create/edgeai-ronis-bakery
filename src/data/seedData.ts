import { getDb } from '@/utils/db';
import productsData from './products.json';

export async function seedDatabase() {
  const db = await getDb();
  
  // Check if data already exists
  const existingTenants = await db.get('SELECT COUNT(*) as count FROM tenants');
  if (existingTenants.count > 0) {
    console.log('Database already seeded with', existingTenants.count, 'tenants');
    return;
  }
  
  console.log('Seeding database with fresh data...');
  
  // Create default tenant first
  const defaultTenant = await db.run(
    `INSERT INTO tenants (name, slug, type, subscription_plan, subscription_status, 
                         max_users, max_products, max_orders_per_month, 
                         primary_contact_email, billing_email, phone, address, 
                         city, postcode, country, timezone, currency, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Roni's Bakery",
      'ronis-bakery',
      'bakery',
      'premium',
      'active',
      50,    // max_users
      500,   // max_products
      10000, // max_orders_per_month
      'admin@ronisbakery.com',
      'billing@ronisbakery.com',
      '+44 20 7946 0958',
      '123 Bakery Street',
      'London',
      'SW1A 1AA',
      'UK',
      'Europe/London',
      'GBP',
      1
    ]
  );
  
  const tenantId = defaultTenant.lastID;
  console.log(`Created default tenant with ID: ${tenantId}`);
  
  // Insert suppliers from JSON data (mark as global suppliers available to all tenants)
  const supplierIdMapping: { [oldId: number]: number } = {};
  
  for (const supplier of productsData.suppliers) {
    const result = await db.run(
      `INSERT INTO suppliers (name, contact, lead_time, mcp_id, email, phone, address, kosher_certified, delivery_schedule, minimum_order, is_global) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier.name,
        supplier.contact,
        supplier.lead_time,
        supplier.mcp_id,
        (supplier as any).email || null,
        (supplier as any).phone || null,
        (supplier as any).address || null,
        supplier.kosher_certified || false,
        supplier.delivery_schedule || null,
        supplier.minimum_order || null,
        1 // is_global = true for demo suppliers
      ]
    );
    
    // Map old ID to new auto-generated ID
    const newSupplierId = result.lastID!;
    supplierIdMapping[supplier.id] = newSupplierId;
    
    // Create tenant-supplier relationship
    await db.run(
      `INSERT INTO tenant_suppliers (tenant_id, supplier_id, is_active, preferred_supplier, payment_terms, discount_percentage)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        newSupplierId,
        1, // is_active
        supplier.id === 1 ? 1 : 0, // Mark first supplier as preferred
        'Net 30',
        5.0 // 5% discount
      ]
    );
  }
  
  console.log(`Inserted ${productsData.suppliers.length} suppliers`);
  
  // Insert products from JSON data with tenant_id
  const productIdMapping: { [oldId: number]: number } = {};
  
  for (const product of productsData.products) {
    const result = await db.run(
      `INSERT INTO products (tenant_id, name, category, current_stock, unit, reorder_point, 
                            optimal_stock, supplier_id, last_delivery, consumption_rate, 
                            predicted_stockout, price, description, image_url,
                            daily_usage, order_quantity, lead_time, lead_time_unit,
                            kosher_certified, storage_temp, shelf_life_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, // Add tenant_id for multi-tenant support
        product.name,
        product.category,
        product.current_stock,
        product.unit,
        product.reorder_point,
        product.optimal_stock,
        supplierIdMapping[product.supplier_id], // Use mapped supplier ID
        product.last_delivery,
        product.consumption_rate,
        product.predicted_stockout,
        product.price,
        (product as any).description || null,
        (product as any).image_url || null,
        product.daily_usage,
        product.order_quantity,
        product.lead_time,
        product.lead_time_unit,
        product.kosher_certified || false,
        product.storage_temp || 'room_temp',
        product.shelf_life_days || null
      ]
    );
    
    // Map old product ID to new auto-generated ID
    productIdMapping[product.id] = result.lastID!;
  }
  
  console.log(`Inserted ${productsData.products.length} products`);
  
  // Insert sample purchase orders from JSON data with tenant_id
  for (const order of productsData.orders) {
    const originalSupplierId = productsData.suppliers.find(s => s.name === order.supplier)?.id || 1;
    const mappedSupplierId = supplierIdMapping[originalSupplierId];
    
    const result = await db.run(
      `INSERT INTO purchase_orders (tenant_id, order_date, supplier_id, status, expected_delivery, total_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, // Add tenant_id for multi-tenant support
        order.date,
        mappedSupplierId, // Use mapped supplier ID
        order.status,
        null, // expected_delivery not provided in JSON
        null, // total_cost not provided in JSON
        `Order from ${order.supplier}`
      ]
    );
    
    // Insert order items
    for (const item of order.items) {
      await db.run(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [
          result.lastID, // Use the new order ID
          productIdMapping[item.productId], // Use mapped product ID
          item.quantity,
          // Get price from product data
          productsData.products.find(p => p.id === item.productId)?.price || 0
        ]
      );
    }
  }
  
  console.log(`Inserted ${productsData.orders.length} purchase orders`);
  
  // Insert consumption records from JSON data with tenant_id
  for (const consumption of productsData.consumptionHistory) {
    for (const productConsumption of consumption.products) {
      await db.run(
        `INSERT INTO consumption_records (tenant_id, record_date, product_id, quantity, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          tenantId, // Add tenant_id for multi-tenant support
          consumption.date,
          productIdMapping[productConsumption.productId], // Use mapped product ID
          productConsumption.quantity,
          'Historical consumption data'
        ]
      );
    }
  }
  
  console.log(`Inserted consumption records for ${productsData.consumptionHistory.length} dates`);
  
  console.log('Roni\'s Bakery database seeded successfully with all 59 products!');
}