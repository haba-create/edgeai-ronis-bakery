import { getDb } from '@/utils/db';
import { PurchaseOrder, OrderItem, ProductWithSupplier, Supplier } from '@/models/types';
import { getProductById } from './productService';

/**
 * Get all purchase orders with their supplier info
 */
export async function getAllOrders(): Promise<PurchaseOrder[]> {
  const db = await getDb();
  
  const orders = await db.all(`
    SELECT po.*, s.name as supplier_name 
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.order_date DESC
  `);
  
  return orders.map(order => ({
    ...order,
    supplier: {
      id: order.supplier_id,
      name: order.supplier_name,
      contact: '',
      lead_time: 0,
      mcp_id: ''
    }
  }));
}

/**
 * Get purchase order by ID with items and supplier info
 */
export async function getOrderById(id: number): Promise<PurchaseOrder | null> {
  const db = await getDb();
  
  const order = await db.get(`
    SELECT po.*, s.* 
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `, [id]);
  
  if (!order) return null;
  
  // Get order items
  const items = await db.all(`
    SELECT oi.*, p.name as product_name, p.unit 
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [id]);
  
  return {
    id: order.id,
    order_date: order.order_date,
    supplier_id: order.supplier_id,
    status: order.status,
    expected_delivery: order.expected_delivery,
    total_cost: order.total_cost,
    notes: order.notes,
    supplier: {
      id: order.id,
      name: order.name,
      contact: order.contact,
      lead_time: order.lead_time,
      mcp_id: order.mcp_id,
      email: order.email,
      phone: order.phone,
      address: order.address
    },
    items: items.map(item => ({
      ...item,
      product: {
        id: item.product_id,
        name: item.product_name,
        unit: item.unit
      } as any
    }))
  };
}

/**
 * Get pending orders (not delivered or cancelled)
 */
export async function getPendingOrders(): Promise<PurchaseOrder[]> {
  const db = await getDb();
  
  const orders = await db.all(`
    SELECT po.*, s.name as supplier_name 
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.status NOT IN ('delivered', 'cancelled')
    ORDER BY po.expected_delivery ASC
  `);
  
  return orders.map(order => ({
    ...order,
    supplier: {
      id: order.supplier_id,
      name: order.supplier_name,
      contact: '',
      lead_time: 0,
      mcp_id: ''
    }
  }));
}

/**
 * Create a new purchase order
 */
export async function createOrder(
  supplier_id: number,
  items: Array<{product_id: number, quantity: number}>,
  notes?: string
): Promise<PurchaseOrder> {
  const db = await getDb();
  
  // Get supplier info for lead time
  const supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [supplier_id]);
  
  // Calculate expected delivery date
  const orderDate = new Date();
  const expectedDelivery = new Date();
  expectedDelivery.setDate(orderDate.getDate() + supplier.lead_time);
  
  // Calculate total cost
  let totalCost = 0;
  const itemsWithPrices = [];
  
  for (const item of items) {
    const product = await db.get(
      'SELECT price FROM products WHERE id = ?',
      [item.product_id]
    );
    
    const unitPrice = product.price;
    const itemCost = unitPrice * item.quantity;
    totalCost += itemCost;
    
    itemsWithPrices.push({
      ...item,
      unit_price: unitPrice
    });
  }
  
  // Create the order
  const result = await db.run(
    `INSERT INTO purchase_orders 
    (order_date, supplier_id, status, expected_delivery, total_cost, notes)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      orderDate.toISOString().split('T')[0],
      supplier_id,
      'pending',
      expectedDelivery.toISOString().split('T')[0],
      totalCost,
      notes || ''
    ]
  );
  
  const orderId = result.lastID;
  
  // Add order items
  for (const item of itemsWithPrices) {
    await db.run(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
      VALUES (?, ?, ?, ?)`,
      [orderId, item.product_id, item.quantity, item.unit_price]
    );
  }
  
  const order = await getOrderById(orderId!);
  if (!order) {
    throw new Error('Failed to retrieve created order');
  }
  return order;
}

/**
 * Update order status
 */
export async function updateOrderStatus(id: number, status: PurchaseOrder['status']): Promise<PurchaseOrder | null> {
  const db = await getDb();
  
  await db.run(
    'UPDATE purchase_orders SET status = ? WHERE id = ?',
    [status, id]
  );
  
  // If the order is delivered, update product stock and last delivery date
  if (status === 'delivered') {
    const items = await db.all(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [id]
    );
    
    const today = new Date().toISOString().split('T')[0];
    
    for (const item of items) {
      // Update stock level
      await db.run(
        'UPDATE products SET current_stock = current_stock + ?, last_delivery = ? WHERE id = ?',
        [item.quantity, today, item.product_id]
      );
      
      // Recalculate predicted stockout date
      const product = await db.get(
        'SELECT current_stock, consumption_rate FROM products WHERE id = ?',
        [item.product_id]
      );
      
      if (product.consumption_rate > 0) {
        const daysUntilStockout = Math.floor(product.current_stock / product.consumption_rate);
        const stockoutDate = new Date();
        stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
        
        await db.run(
          'UPDATE products SET predicted_stockout = ? WHERE id = ?',
          [stockoutDate.toISOString().split('T')[0], item.product_id]
        );
      }
    }
  }
  
  return getOrderById(id);
}

/**
 * Get suppliers
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDb();
  return db.all('SELECT * FROM suppliers ORDER BY name');
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(id: number): Promise<Supplier | null> {
  const db = await getDb();
  const result = await db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
  return result || null;
}

/**
 * Generate recommended order for low stock products
 */
export async function generateRecommendedOrder(): Promise<Record<number, Array<{product: ProductWithSupplier, quantity: number}>>> {
  const db = await getDb();
  
  // Get products below reorder point
  const lowStockProducts = await db.all(`
    SELECT p.*, s.id as supplier_id, s.name as supplier_name, s.lead_time
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.current_stock <= p.reorder_point
    ORDER BY s.name, p.name
  `);
  
  const recommendations: Record<number, Array<{product: ProductWithSupplier, quantity: number}>> = {};
  
  for (const product of lowStockProducts) {
    const enrichedProduct = {
      ...product,
      supplier: {
        id: product.supplier_id,
        name: product.supplier_name,
        lead_time: product.lead_time,
        contact: '',
        mcp_id: ''
      },
      stock_status: product.current_stock <= product.reorder_point * 0.5 ? 'critical' : 'low',
      days_until_stockout: 0
    } as ProductWithSupplier;
    
    // Calculate recommended order quantity
    const orderQuantity = product.optimal_stock - product.current_stock;
    
    if (!recommendations[product.supplier_id]) {
      recommendations[product.supplier_id] = [];
    }
    
    recommendations[product.supplier_id].push({
      product: enrichedProduct,
      quantity: orderQuantity
    });
  }
  
  return recommendations;
}
