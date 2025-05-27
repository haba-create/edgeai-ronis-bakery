import { getDb } from '@/utils/db';
import productsData from './products.json';

export async function seedDatabase() {
  const db = await getDb();
  
  // Check if data already exists
  const existingProducts = await db.get('SELECT COUNT(*) as count FROM products');
  if (existingProducts.count > 0) {
    console.log('Database already seeded with', existingProducts.count, 'products');
    return;
  }
  
  console.log('Seeding database with fresh data...');
  
  // Insert suppliers from JSON data
  for (const supplier of productsData.suppliers) {
    await db.run(
      `INSERT INTO suppliers (id, name, contact, lead_time, mcp_id, email, phone, address, kosher_certified, delivery_schedule, minimum_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier.id,
        supplier.name,
        supplier.contact,
        supplier.lead_time,
        supplier.mcp_id,
        (supplier as any).email || null,
        (supplier as any).phone || null,
        (supplier as any).address || null,
        supplier.kosher_certified || false,
        supplier.delivery_schedule || null,
        supplier.minimum_order || null
      ]
    );
  }
  
  console.log(`Inserted ${productsData.suppliers.length} suppliers`);
  
  // Insert products from JSON data
  for (const product of productsData.products) {
    await db.run(
      `INSERT INTO products (id, name, category, current_stock, unit, reorder_point, 
                            optimal_stock, supplier_id, last_delivery, consumption_rate, 
                            predicted_stockout, price, description, image_url,
                            daily_usage, order_quantity, lead_time, lead_time_unit,
                            kosher_certified, storage_temp, shelf_life_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.name,
        product.category,
        product.current_stock,
        product.unit,
        product.reorder_point,
        product.optimal_stock,
        product.supplier_id,
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
  }
  
  console.log(`Inserted ${productsData.products.length} products`);
  
  // Insert sample purchase orders from JSON data
  for (const order of productsData.orders) {
    const result = await db.run(
      `INSERT INTO purchase_orders (id, order_date, supplier_id, status, expected_delivery, total_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        order.date,
        // Find supplier ID by name
        productsData.suppliers.find(s => s.name === order.supplier)?.id || 1,
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
          order.id,
          item.productId,
          item.quantity,
          // Get price from product data
          productsData.products.find(p => p.id === item.productId)?.price || 0
        ]
      );
    }
  }
  
  console.log(`Inserted ${productsData.orders.length} purchase orders`);
  
  // Insert consumption records from JSON data
  for (const consumption of productsData.consumptionHistory) {
    for (const productConsumption of consumption.products) {
      await db.run(
        `INSERT INTO consumption_records (record_date, product_id, quantity, notes)
         VALUES (?, ?, ?, ?)`,
        [
          consumption.date,
          productConsumption.productId,
          productConsumption.quantity,
          'Historical consumption data'
        ]
      );
    }
  }
  
  console.log(`Inserted consumption records for ${productsData.consumptionHistory.length} dates`);
  
  console.log('Roni\'s Bakery database seeded successfully with all 59 products!');
}