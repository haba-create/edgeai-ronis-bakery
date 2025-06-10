import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await getDb();
  
  try {
    const { customer_info, items, total_amount, notes } = req.body;
    
    if (!customer_info || !items || !items.length) {
      return res.status(400).json({ error: 'Customer info and items are required' });
    }

    // Insert customer order
    const orderResult = await db.run(`
      INSERT INTO customer_orders (
        customer_name, customer_email, customer_phone, 
        delivery_address, total_amount, notes, 
        status, order_date
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `, [
      customer_info.name,
      customer_info.email, 
      customer_info.phone,
      customer_info.address,
      total_amount,
      notes || ''
    ]);

    const orderId = orderResult.lastID;

    // Insert order items
    for (const item of items) {
      await db.run(`
        INSERT INTO customer_order_items (
          order_id, product_id, quantity, price_per_unit
        ) VALUES (?, ?, ?, ?)
      `, [
        orderId,
        item.product_id,
        item.quantity,
        item.price
      ]);
    }

    // Create the tables if they don't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS customer_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        total_amount REAL NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS customer_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_unit REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES customer_orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    res.status(201).json({ 
      success: true, 
      orderId,
      message: 'Order placed successfully' 
    });
  } catch (error) {
    console.error('Customer order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
}