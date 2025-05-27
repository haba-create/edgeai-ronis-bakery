import { getDb } from '@/utils/db';
import { Product, ProductWithSupplier, StockAlert, ConsumptionTrend } from '@/models/types';

/**
 * Get all products with their suppliers and stock status
 */
export async function getAllProducts(): Promise<ProductWithSupplier[]> {
  const db = await getDb();
  
  const products = await db.all(`
    SELECT p.*, s.name as supplier_name, s.lead_time 
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.name
  `);
  
  return products.map(enrichProductWithStockStatus);
}

/**
 * Get product by ID with supplier and stock status
 */
export async function getProductById(id: number): Promise<ProductWithSupplier | null> {
  const db = await getDb();
  
  const product = await db.get(`
    SELECT p.*, s.name as supplier_name, s.lead_time 
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `, [id]);
  
  if (!product) return null;
  
  return enrichProductWithStockStatus(product);
}

/**
 * Get products by category
 */
export async function getProductsByCategory(category: string): Promise<ProductWithSupplier[]> {
  const db = await getDb();
  
  const products = await db.all(`
    SELECT p.*, s.name as supplier_name, s.lead_time 
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.category = ?
    ORDER BY p.name
  `, [category]);
  
  return products.map(enrichProductWithStockStatus);
}

/**
 * Get all stock alerts for products that need attention
 */
export async function getStockAlerts(): Promise<StockAlert[]> {
  const db = await getDb();
  
  const lowStockProducts = await db.all(`
    SELECT p.*, s.name as supplier_name, s.lead_time, s.id as supplier_id
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.current_stock <= p.reorder_point
    ORDER BY (p.current_stock / p.reorder_point) ASC
  `);
  
  return lowStockProducts.map(product => {
    const enrichedProduct = enrichProductWithStockStatus(product);
    const percentRemaining = (product.current_stock / product.reorder_point) * 100;
    
    let priority: 'high' | 'medium' | 'low' = 'low';
    let message = '';
    
    if (percentRemaining <= 50) {
      priority = 'high';
      message = `Critical: ${product.name} is at ${percentRemaining.toFixed(0)}% of reorder point. Predicted stockout by ${product.predicted_stockout}.`;
    } else if (percentRemaining <= 75) {
      priority = 'medium';
      message = `Warning: ${product.name} is below reorder point. Consider restocking soon.`;
    } else {
      message = `${product.name} is near reorder point.`;
    }
    
    const recommendedOrderQuantity = product.optimal_stock - product.current_stock;
    
    return {
      product: enrichedProduct,
      message,
      priority,
      recommended_order_quantity: recommendedOrderQuantity
    };
  });
}

/**
 * Get consumption trends for all products
 */
export async function getConsumptionTrends(): Promise<ConsumptionTrend[]> {
  const db = await getDb();
  
  // Get last 7 days of consumption records
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const consumptionRecords = await db.all(`
    SELECT 
      cr.product_id,
      p.name as product_name,
      p.consumption_rate as baseline_rate,
      AVG(cr.quantity) as avg_daily_consumption
    FROM consumption_records cr
    JOIN products p ON cr.product_id = p.id
    WHERE cr.record_date >= ?
    GROUP BY cr.product_id
  `, [dateStr]);
  
  return consumptionRecords.map(record => {
    const trend_percentage = ((record.avg_daily_consumption / record.baseline_rate) - 1) * 100;
    let trend_direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (trend_percentage > 10) {
      trend_direction = 'increasing';
    } else if (trend_percentage < -10) {
      trend_direction = 'decreasing';
    }
    
    return {
      product_id: record.product_id,
      product_name: record.product_name,
      avg_daily_consumption: record.avg_daily_consumption,
      trend_percentage,
      trend_direction
    };
  });
}

/**
 * Update product stock level
 */
export async function updateProductStock(id: number, newStock: number): Promise<ProductWithSupplier | null> {
  const db = await getDb();
  
  await db.run(
    'UPDATE products SET current_stock = ? WHERE id = ?',
    [newStock, id]
  );
  
  return getProductById(id);
}

/**
 * Record product consumption
 */
export async function recordConsumption(product_id: number, quantity: number, notes?: string): Promise<void> {
  const db = await getDb();
  const date = new Date().toISOString().split('T')[0];
  
  // Record the consumption
  await db.run(
    'INSERT INTO consumption_records (record_date, product_id, quantity, notes) VALUES (?, ?, ?, ?)',
    [date, product_id, quantity, notes || 'Daily usage']
  );
  
  // Update the product's current stock
  await db.run(
    'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
    [quantity, product_id]
  );
  
  // Update the predicted stockout date based on consumption rate
  const product = await db.get('SELECT current_stock, consumption_rate FROM products WHERE id = ?', [product_id]);
  
  if (product && product.consumption_rate > 0) {
    const daysUntilStockout = Math.floor(product.current_stock / product.consumption_rate);
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
    
    await db.run(
      'UPDATE products SET predicted_stockout = ? WHERE id = ?',
      [stockoutDate.toISOString().split('T')[0], product_id]
    );
  }
}

/**
 * Get product categories
 */
export async function getProductCategories(): Promise<string[]> {
  const db = await getDb();
  
  const categories = await db.all('SELECT DISTINCT category FROM products ORDER BY category');
  return categories.map(c => c.category);
}

// Helper function to enrich a product with stock status information
function enrichProductWithStockStatus(product: any): ProductWithSupplier {
  // Calculate days until stockout
  const today = new Date();
  const stockoutDate = new Date(product.predicted_stockout);
  const daysUntilStockout = Math.max(0, Math.floor((stockoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Determine stock status
  let stockStatus: 'ok' | 'low' | 'critical' = 'ok';
  
  if (product.current_stock <= product.reorder_point * 0.5) {
    stockStatus = 'critical';
  } else if (product.current_stock <= product.reorder_point) {
    stockStatus = 'low';
  }
  
  return {
    ...product,
    supplier: {
      id: product.supplier_id,
      name: product.supplier_name,
      lead_time: product.lead_time,
      contact: '',
      mcp_id: ''
    },
    stock_status: stockStatus,
    days_until_stockout: daysUntilStockout
  };
}
