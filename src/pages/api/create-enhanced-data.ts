import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    
    // Create enhanced tables
    await db.exec(`
      -- Supplier Product Pricing table
      CREATE TABLE IF NOT EXISTS supplier_product_pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quality_score DECIMAL(3,1) DEFAULT 8.0,
        availability_status TEXT DEFAULT 'available',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE(supplier_id, product_id)
      );

      -- Auto Ordering Configuration table
      CREATE TABLE IF NOT EXISTS auto_ordering_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        strategy TEXT DEFAULT 'lowest_price',
        min_quality_score DECIMAL(3,1) DEFAULT 8.0,
        max_lead_time_days INTEGER DEFAULT 7,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE(product_id)
      );

      -- Email Logs table
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER,
        email_type TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        subject TEXT,
        status TEXT DEFAULT 'sent',
        mailtrap_message_id TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      );
    `);

    // Add new suppliers (using existing schema)
    const newSuppliers = [
      { name: 'Organic Valley Suppliers', email: 'orders@organicvalley.co.uk', phone: '+44 20 7946 0956', address: 'Surrey, UK' },
      { name: 'London Coffee Roasters', email: 'wholesale@londoncoffee.com', phone: '+44 20 7946 0957', address: 'Shoreditch, London' },
      { name: 'British Dairy Collective', email: 'orders@britishdairy.co.uk', phone: '+44 20 7946 0958', address: 'Devon, UK' },
      { name: 'Artisan Cheese Company', email: 'sales@artisancheese.london', phone: '+44 20 7946 0959', address: 'Borough Market, London' },
      { name: 'Fresh Greens Ltd', email: 'orders@freshgreens.co.uk', phone: '+44 20 7946 0960', address: 'Kent, UK' },
      { name: 'Premium Seafood Suppliers', email: 'wholesale@premiumseafood.london', phone: '+44 20 7946 0961', address: 'Billingsgate, London' },
      { name: 'Gourmet Spice House', email: 'orders@gourmetspice.co.uk', phone: '+44 20 7946 0962', address: 'Brick Lane, London' },
      { name: 'London Meat Market', email: 'orders@londonmeat.co.uk', phone: '+44 20 7946 0963', address: 'Smithfield, London' },
      { name: 'Continental Delicacies', email: 'sales@continentaldelicacies.london', phone: '+44 20 7946 0964', address: 'Covent Garden, London' },
      { name: 'Sustainable Packaging Co', email: 'orders@sustainablepack.co.uk', phone: '+44 20 7946 0965', address: 'Greenwich, London' },
      { name: 'Kosher Specialty Foods', email: 'orders@kosherspecialty.london', phone: '+44 20 7946 0966', address: 'Golders Green, London' },
      { name: 'Camden Craft Beverages', email: 'wholesale@camdencraftbev.com', phone: '+44 20 7946 0967', address: 'Camden, London' }
    ];

    for (const supplier of newSuppliers) {
      await db.run(`
        INSERT OR IGNORE INTO suppliers (name, email, phone, address)
        VALUES (?, ?, ?, ?)
      `, [supplier.name, supplier.email, supplier.phone, supplier.address]);
    }

    // Add new products for cafes
    const newProducts = [
      { name: 'Oat Milk Cappuccino', category: 'beverages', unit: 'cup', tenant_id: 1, current_stock: 50, reorder_point: 10, optimal_stock: 100, order_quantity: 50, price: 3.50, supplier_id: 14 },
      { name: 'Almond Croissant', category: 'pastries', unit: 'piece', tenant_id: 1, current_stock: 25, reorder_point: 5, optimal_stock: 50, order_quantity: 25, price: 3.25, supplier_id: 1 },
      { name: 'Avocado Toast', category: 'sandwiches', unit: 'serving', tenant_id: 1, current_stock: 30, reorder_point: 8, optimal_stock: 60, order_quantity: 30, price: 6.50, supplier_id: 17 },
      { name: 'Matcha Latte', category: 'beverages', unit: 'cup', tenant_id: 1, current_stock: 40, reorder_point: 10, optimal_stock: 80, order_quantity: 40, price: 4.25, supplier_id: 14 },
      { name: 'Smoked Salmon Bagel', category: 'bagels', unit: 'piece', tenant_id: 1, current_stock: 20, reorder_point: 5, optimal_stock: 40, order_quantity: 20, price: 8.50, supplier_id: 18 },
      { name: 'Vegan Chocolate Muffin', category: 'pastries', unit: 'piece', tenant_id: 1, current_stock: 35, reorder_point: 8, optimal_stock: 70, order_quantity: 35, price: 3.75, supplier_id: 13 },
      { name: 'Cold Brew Coffee', category: 'beverages', unit: 'cup', tenant_id: 1, current_stock: 45, reorder_point: 12, optimal_stock: 90, order_quantity: 45, price: 3.75, supplier_id: 14 },
      { name: 'Quinoa Salad Bowl', category: 'salads', unit: 'bowl', tenant_id: 1, current_stock: 25, reorder_point: 6, optimal_stock: 50, order_quantity: 25, price: 7.25, supplier_id: 17 },
      { name: 'Artisan Sourdough Bread', category: 'bread', unit: 'loaf', tenant_id: 1, current_stock: 15, reorder_point: 3, optimal_stock: 30, order_quantity: 15, price: 4.50, supplier_id: 1 },
      { name: 'Fresh Orange Juice', category: 'beverages', unit: 'glass', tenant_id: 1, current_stock: 30, reorder_point: 8, optimal_stock: 60, order_quantity: 30, price: 3.25, supplier_id: 17 },
      { name: 'Protein Smoothie', category: 'beverages', unit: 'cup', tenant_id: 1, current_stock: 35, reorder_point: 8, optimal_stock: 70, order_quantity: 35, price: 5.50, supplier_id: 17 },
      { name: 'Gluten-Free Brownie', category: 'pastries', unit: 'piece', tenant_id: 1, current_stock: 20, reorder_point: 5, optimal_stock: 40, order_quantity: 20, price: 4.25, supplier_id: 13 },
      { name: 'Chai Tea Latte', category: 'beverages', unit: 'cup', tenant_id: 1, current_stock: 40, reorder_point: 10, optimal_stock: 80, order_quantity: 40, price: 3.95, supplier_id: 14 },
      { name: 'Mediterranean Wrap', category: 'sandwiches', unit: 'piece', tenant_id: 1, current_stock: 28, reorder_point: 7, optimal_stock: 56, order_quantity: 28, price: 6.75, supplier_id: 17 },
      { name: 'Earl Grey Tea', category: 'beverages', unit: 'cup', tenant_id: 1, current_stock: 50, reorder_point: 12, optimal_stock: 100, order_quantity: 50, price: 2.50, supplier_id: 14 },
      { name: 'Organic Granola Bowl', category: 'breakfast', unit: 'bowl', tenant_id: 1, current_stock: 22, reorder_point: 6, optimal_stock: 44, order_quantity: 22, price: 5.25, supplier_id: 13 }
    ];

    for (const product of newProducts) {
      await db.run(`
        INSERT OR IGNORE INTO products (name, category, unit, tenant_id, current_stock, reorder_point, optimal_stock, order_quantity, price, supplier_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [product.name, product.category, product.unit, product.tenant_id, product.current_stock, product.reorder_point, product.optimal_stock, product.order_quantity, product.price, product.supplier_id]);
    }

    // Get all products and suppliers to create pricing matrix
    const products = await db.all('SELECT id, name FROM products');
    const suppliers = await db.all('SELECT id, name FROM suppliers');

    // Create pricing entries (each product available from 2-4 suppliers with different prices)
    let pricingEntries = 0;
    for (const product of products) {
      const supplierSubset = suppliers.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 2);
      
      for (let i = 0; i < supplierSubset.length; i++) {
        const supplier = supplierSubset[i];
        const basePrice = 2.50 + Math.random() * 8; // £2.50 - £10.50
        const qualityScore = 7.5 + Math.random() * 2.5; // 7.5 - 10.0
        const priceVariation = i === 0 ? 0 : (Math.random() - 0.5) * 2; // ±£1 variation
        
        await db.run(`
          INSERT OR IGNORE INTO supplier_product_pricing (supplier_id, product_id, price, quality_score, availability_status)
          VALUES (?, ?, ?, ?, 'available')
        `, [supplier.id, product.id, (basePrice + priceVariation).toFixed(2), qualityScore.toFixed(1)]);
        
        pricingEntries++;
      }
    }

    // Create auto-ordering config for some products
    const sampleProducts = products.slice(0, 20);
    for (const product of sampleProducts) {
      const strategies = ['lowest_price', 'best_quality', 'balanced'];
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      
      await db.run(`
        INSERT OR IGNORE INTO auto_ordering_config (product_id, enabled, strategy, min_quality_score)
        VALUES (?, 1, ?, ?)
      `, [product.id, strategy, 8.0 + Math.random() * 1.5]);
    }

    // Get counts for summary
    const supplierCount = await db.get('SELECT COUNT(*) as count FROM suppliers');
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    const pricingCount = await db.get('SELECT COUNT(*) as count FROM supplier_product_pricing');
    const configCount = await db.get('SELECT COUNT(*) as count FROM auto_ordering_config');

    res.status(200).json({
      success: true,
      message: 'Enhanced data created successfully',
      summary: {
        suppliers: supplierCount.count,
        products: productCount.count,
        pricing_entries: pricingCount.count,
        auto_ordering_configs: configCount.count
      }
    });

  } catch (error) {
    console.error('Error creating enhanced data:', error);
    res.status(500).json({
      error: 'Failed to create enhanced data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}