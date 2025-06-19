import { getDb } from './db';

export interface SupplierPrice {
  supplier_id: number;
  supplier_name: string;
  price: number;
  quality_score: number;
  lead_time: string;
  minimum_order: number;
  delivery_schedule: string;
}

export interface OrderRecommendation {
  product_id: number;
  product_name: string;
  recommended_supplier_id: number;
  recommended_supplier_name: string;
  recommended_price: number;
  quantity_needed: number;
  total_cost: number;
  savings: number;
  reason: string;
  alternative_suppliers: SupplierPrice[];
}

export interface AutoOrderResult {
  recommendations: OrderRecommendation[];
  total_cost: number;
  total_savings: number;
  grouped_by_supplier: {
    [supplier_id: number]: {
      supplier_name: string;
      items: OrderRecommendation[];
      subtotal: number;
      meets_minimum: boolean;
      minimum_order: number;
    };
  };
}

// Get all supplier prices for a product
export async function getSupplierPricesForProduct(
  productId: number,
  minQualityScore: number = 8.0
): Promise<SupplierPrice[]> {
  const db = await getDb();
  
  const prices = await db.all(`
    SELECT 
      spp.supplier_id,
      s.name as supplier_name,
      spp.price,
      spp.quality_score,
      s.lead_time,
      s.minimum_order,
      s.delivery_schedule
    FROM supplier_product_pricing spp
    JOIN suppliers s ON spp.supplier_id = s.id
    WHERE spp.product_id = ? 
      AND spp.quality_score >= ?
      AND s.is_active = 1
    ORDER BY spp.price ASC
  `, [productId, minQualityScore]);
  
  return prices;
}

// Calculate optimal supplier based on strategy
export async function getOptimalSupplier(
  productId: number,
  quantity: number,
  strategy: string = 'lowest_price'
): Promise<SupplierPrice | null> {
  const db = await getDb();
  
  // Get auto-ordering config
  const config = await db.get(`
    SELECT * FROM auto_ordering_config 
    WHERE product_id = ? AND enabled = 1
  `, [productId]);
  
  const minQuality = config?.min_quality_score || 8.0;
  const prices = await getSupplierPricesForProduct(productId, minQuality);
  
  if (prices.length === 0) return null;
  
  let optimal: SupplierPrice;
  
  switch (strategy) {
    case 'lowest_price':
      optimal = prices[0]; // Already sorted by price
      break;
      
    case 'best_quality':
      optimal = prices.sort((a, b) => b.quality_score - a.quality_score)[0];
      break;
      
    case 'balanced':
      // Score based on price (40%) and quality (60%)
      optimal = prices.sort((a, b) => {
        const scoreA = (1 / a.price) * 0.4 + (a.quality_score / 10) * 0.6;
        const scoreB = (1 / b.price) * 0.4 + (b.quality_score / 10) * 0.6;
        return scoreB - scoreA;
      })[0];
      break;
      
    default:
      optimal = prices[0];
  }
  
  return optimal;
}

// Generate automatic order recommendations
export async function generateAutoOrder(
  tenantId: number,
  productIds?: number[]
): Promise<AutoOrderResult> {
  const db = await getDb();
  
  // Get products that need reordering
  let query = `
    SELECT 
      p.id,
      p.name,
      p.current_stock,
      p.reorder_point,
      p.optimal_stock,
      p.order_quantity,
      p.price as current_price,
      p.supplier_id as current_supplier_id,
      s.name as current_supplier_name,
      aoc.strategy,
      aoc.min_quality_score
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN auto_ordering_config aoc ON p.id = aoc.product_id
    WHERE p.tenant_id = ?
      AND p.current_stock <= p.reorder_point
      AND (aoc.enabled = 1 OR aoc.enabled IS NULL)
  `;
  
  const params: any[] = [tenantId];
  
  if (productIds && productIds.length > 0) {
    query += ` AND p.id IN (${productIds.map(() => '?').join(',')})`;
    params.push(...productIds);
  }
  
  const productsToOrder = await db.all(query, params);
  
  const recommendations: OrderRecommendation[] = [];
  let totalCost = 0;
  let totalSavings = 0;
  
  for (const product of productsToOrder) {
    const quantityNeeded = product.order_quantity || (product.optimal_stock - product.current_stock);
    
    // Get optimal supplier
    const optimal = await getOptimalSupplier(
      product.id,
      quantityNeeded,
      product.strategy || 'lowest_price'
    );
    
    if (!optimal) continue;
    
    // Get all alternatives for comparison
    const alternatives = await getSupplierPricesForProduct(
      product.id,
      product.min_quality_score || 8.0
    );
    
    const itemCost = optimal.price * quantityNeeded;
    const currentCost = product.current_price * quantityNeeded;
    const savings = Math.max(0, currentCost - itemCost);
    
    totalCost += itemCost;
    totalSavings += savings;
    
    let reason = '';
    if (product.strategy === 'lowest_price') {
      reason = `Lowest price supplier (£${optimal.price} per ${product.unit})`;
    } else if (product.strategy === 'best_quality') {
      reason = `Highest quality score (${optimal.quality_score}/10)`;
    } else {
      reason = `Best value - balanced price and quality`;
    }
    
    if (savings > 0) {
      reason += ` - Saves £${savings.toFixed(2)} vs current supplier`;
    }
    
    recommendations.push({
      product_id: product.id,
      product_name: product.name,
      recommended_supplier_id: optimal.supplier_id,
      recommended_supplier_name: optimal.supplier_name,
      recommended_price: optimal.price,
      quantity_needed: quantityNeeded,
      total_cost: itemCost,
      savings,
      reason,
      alternative_suppliers: alternatives
    });
  }
  
  // Group by supplier
  const groupedBySupplier: AutoOrderResult['grouped_by_supplier'] = {};
  
  for (const rec of recommendations) {
    if (!groupedBySupplier[rec.recommended_supplier_id]) {
      const supplier = await db.get(
        'SELECT name, minimum_order FROM suppliers WHERE id = ?',
        [rec.recommended_supplier_id]
      );
      
      groupedBySupplier[rec.recommended_supplier_id] = {
        supplier_name: supplier.name,
        items: [],
        subtotal: 0,
        meets_minimum: false,
        minimum_order: supplier.minimum_order || 0
      };
    }
    
    groupedBySupplier[rec.recommended_supplier_id].items.push(rec);
    groupedBySupplier[rec.recommended_supplier_id].subtotal += rec.total_cost;
  }
  
  // Check minimum orders
  for (const supplierId in groupedBySupplier) {
    const group = groupedBySupplier[supplierId];
    group.meets_minimum = group.subtotal >= group.minimum_order;
  }
  
  return {
    recommendations,
    total_cost: totalCost,
    total_savings: totalSavings,
    grouped_by_supplier: groupedBySupplier
  };
}

// Create purchase orders from recommendations
export async function createOrdersFromRecommendations(
  tenantId: number,
  recommendations: OrderRecommendation[],
  userId: number
): Promise<number[]> {
  const db = await getDb();
  const orderIds: number[] = [];
  
  // Group by supplier
  const bySupplier = recommendations.reduce((acc, rec) => {
    if (!acc[rec.recommended_supplier_id]) {
      acc[rec.recommended_supplier_id] = [];
    }
    acc[rec.recommended_supplier_id].push(rec);
    return acc;
  }, {} as { [key: number]: OrderRecommendation[] });
  
  // Create order for each supplier
  for (const [supplierId, items] of Object.entries(bySupplier)) {
    const totalCost = items.reduce((sum, item) => sum + item.total_cost, 0);
    
    // Create purchase order
    const orderResult = await db.run(`
      INSERT INTO purchase_orders (
        tenant_id, 
        supplier_id, 
        order_date, 
        status, 
        total_cost, 
        created_by,
        notes
      ) VALUES (?, ?, datetime('now'), 'pending', ?, ?, ?)
    `, [
      tenantId,
      supplierId,
      totalCost,
      userId,
      `Auto-generated order - ${items.length} items, saved £${items.reduce((sum, item) => sum + item.savings, 0).toFixed(2)}`
    ]);
    
    const orderId = orderResult.lastID!;
    orderIds.push(orderId);
    
    // Create order items
    for (const item of items) {
      await db.run(`
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          unit_price
        ) VALUES (?, ?, ?, ?)
      `, [orderId, item.product_id, item.quantity_needed, item.recommended_price]);
      
      // Update product supplier if changed
      if (item.savings > 0) {
        await db.run(`
          UPDATE products 
          SET supplier_id = ?, price = ?
          WHERE id = ?
        `, [item.recommended_supplier_id, item.recommended_price, item.product_id]);
      }
    }
  }
  
  return orderIds;
}