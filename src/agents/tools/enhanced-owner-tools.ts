import { generateAutoOrder, getSupplierPricesForProduct, createOrdersFromRecommendations } from '@/utils/auto-ordering';
import { sendOrderConfirmation, sendLowStockAlert } from '@/utils/email-service';
import { getDb } from '@/utils/db';

export const enhancedOwnerTools = [
  {
    name: "compare_supplier_prices",
    description: "Compare prices across different suppliers for a specific product",
    parameters: {
      type: "object",
      properties: {
        product_name: { 
          type: "string", 
          description: "Name of the product to compare prices for" 
        },
        min_quality_score: { 
          type: "number", 
          description: "Minimum quality score filter (1-10)", 
          default: 8.0 
        }
      },
      required: ["product_name"]
    }
  },
  {
    name: "generate_auto_order",
    description: "Generate automatic order recommendations based on inventory levels and price optimization",
    parameters: {
      type: "object",
      properties: {
        strategy: { 
          type: "string", 
          description: "Ordering strategy", 
          enum: ["lowest_price", "best_quality", "balanced"],
          default: "lowest_price"
        },
        product_categories: {
          type: "array",
          description: "Filter by specific product categories",
          items: { type: "string" }
        }
      }
    }
  },
  {
    name: "create_optimized_order",
    description: "Create purchase orders from auto-generated recommendations",
    parameters: {
      type: "object",
      properties: {
        approve_all: { 
          type: "boolean", 
          description: "Automatically approve all recommendations", 
          default: false 
        },
        product_ids: {
          type: "array",
          description: "Specific product IDs to include in the order",
          items: { type: "number" }
        }
      }
    }
  },
  {
    name: "send_order_notification",
    description: "Send order confirmation email to suppliers via MailTrap",
    parameters: {
      type: "object",
      properties: {
        order_id: { 
          type: "number", 
          description: "Purchase order ID to send notification for" 
        }
      },
      required: ["order_id"]
    }
  },
  {
    name: "analyze_cost_savings",
    description: "Analyze potential cost savings by switching suppliers",
    parameters: {
      type: "object",
      properties: {
        time_period: { 
          type: "string", 
          description: "Time period for analysis", 
          enum: ["weekly", "monthly", "yearly"],
          default: "monthly"
        }
      }
    }
  },
  {
    name: "manage_supplier_preferences",
    description: "Update supplier preferences and auto-ordering strategies",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "number", description: "Product ID to configure" },
        strategy: { 
          type: "string", 
          enum: ["lowest_price", "best_quality", "balanced"] 
        },
        min_quality_score: { type: "number", description: "Minimum quality score (1-10)" }
      },
      required: ["product_id"]
    }
  },
  {
    name: "view_supplier_performance",
    description: "View performance metrics for suppliers including delivery time, quality, and pricing",
    parameters: {
      type: "object",
      properties: {
        supplier_name: { 
          type: "string", 
          description: "Filter by specific supplier name" 
        },
        metric: { 
          type: "string", 
          description: "Specific metric to focus on", 
          enum: ["delivery_time", "quality_score", "price_competitiveness", "all"] 
        }
      }
    }
  },
  {
    name: "send_low_stock_alerts",
    description: "Send low stock alert emails for products below reorder point",
    parameters: {
      type: "object",
      properties: {
        product_id: { 
          type: "number", 
          description: "Specific product ID, or leave empty for all low stock products" 
        }
      }
    }
  }
];

export async function executeEnhancedOwnerTool(
  toolName: string,
  args: any,
  context: { userId: string; userRole: string; db: any }
): Promise<any> {
  const db = context.db;
  
  // Get user's tenant ID
  const user = await db.get('SELECT tenant_id FROM users WHERE id = ?', [context.userId]);
  const tenantId = user?.tenant_id || 1;

  switch (toolName) {
    case 'compare_supplier_prices':
      return await compareSupplierPrices(args.product_name, args.min_quality_score || 8.0, db);
      
    case 'generate_auto_order':
      return await generateAutoOrder(tenantId, undefined);
      
    case 'create_optimized_order':
      return await createOptimizedOrder(tenantId, context.userId, args, db);
      
    case 'send_order_notification':
      return await sendOrderNotification(args.order_id);
      
    case 'analyze_cost_savings':
      return await analyzeCostSavings(tenantId, args.time_period || 'monthly', db);
      
    case 'manage_supplier_preferences':
      return await manageSupplierPreferences(args, db);
      
    case 'view_supplier_performance':
      return await viewSupplierPerformance(args.supplier_name, args.metric || 'all', db);
      
    case 'send_low_stock_alerts':
      return await sendLowStockAlerts(args.product_id, tenantId, db);
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function compareSupplierPrices(productName: string, minQuality: number, db: any) {
  // Find product by name
  const product = await db.get(
    'SELECT id, name, price as current_price, unit FROM products WHERE name LIKE ?',
    [`%${productName}%`]
  );
  
  if (!product) {
    return { error: `Product '${productName}' not found` };
  }
  
  const suppliers = await getSupplierPricesForProduct(product.id, minQuality);
  
  if (suppliers.length === 0) {
    return { 
      product: product.name,
      current_price: product.current_price,
      message: `No suppliers found meeting quality score of ${minQuality}/10`
    };
  }
  
  const cheapest = suppliers[0];
  const savings = Math.max(0, product.current_price - cheapest.price);
  
  return {
    product: product.name,
    unit: product.unit,
    current_price: product.current_price,
    suppliers: suppliers.slice(0, 5), // Top 5 suppliers
    best_deal: {
      supplier: cheapest.supplier_name,
      price: cheapest.price,
      quality_score: cheapest.quality_score,
      savings_per_unit: savings,
      percentage_savings: product.current_price > 0 ? (savings / product.current_price * 100).toFixed(1) : 0
    }
  };
}

async function createOptimizedOrder(tenantId: number, userId: string, args: any, db: any) {
  const recommendations = await generateAutoOrder(tenantId, args.product_ids);
  
  if (recommendations.recommendations.length === 0) {
    return { message: 'No products need ordering at this time' };
  }
  
  // Create orders from recommendations
  const orderIds = await createOrdersFromRecommendations(
    tenantId,
    recommendations.recommendations,
    parseInt(userId)
  );
  
  // Send notifications for each order
  const notifications = [];
  for (const orderId of orderIds) {
    const sent = await sendOrderConfirmation(orderId);
    notifications.push({ order_id: orderId, email_sent: sent });
  }
  
  return {
    message: `Created ${orderIds.length} optimized purchase orders`,
    orders_created: orderIds,
    total_cost: recommendations.total_cost,
    total_savings: recommendations.total_savings,
    email_notifications: notifications,
    recommendations: recommendations.recommendations
  };
}

async function sendOrderNotification(orderId: number) {
  const success = await sendOrderConfirmation(orderId);
  
  return {
    order_id: orderId,
    email_sent: success,
    message: success 
      ? 'Order confirmation email sent successfully'
      : 'Failed to send order confirmation email'
  };
}

async function analyzeCostSavings(tenantId: number, period: string, db: any) {
  const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
  
  const analysis = await db.all(`
    SELECT 
      p.name,
      p.price as current_price,
      p.daily_usage,
      MIN(spp.price) as best_price,
      s.name as best_supplier,
      (p.price - MIN(spp.price)) * p.daily_usage * ? as potential_savings
    FROM products p
    JOIN supplier_product_pricing spp ON p.id = spp.product_id
    JOIN suppliers s ON spp.supplier_id = s.id
    WHERE p.tenant_id = ?
      AND spp.price < p.price
    GROUP BY p.id
    ORDER BY potential_savings DESC
    LIMIT 10
  `, [days, tenantId]);
  
  const totalSavings = analysis.reduce((sum: number, item: any) => sum + item.potential_savings, 0);
  
  return {
    period,
    total_potential_savings: totalSavings,
    opportunities: analysis,
    message: `You could save £${totalSavings.toFixed(2)} per ${period.replace('ly', '')} by optimizing suppliers`
  };
}

async function manageSupplierPreferences(args: any, db: any) {
  const { product_id, strategy, min_quality_score } = args;
  
  const updates: any = {};
  if (strategy) updates.strategy = strategy;
  if (min_quality_score) updates.min_quality_score = min_quality_score;
  
  if (Object.keys(updates).length === 0) {
    return { error: 'No updates specified' };
  }
  
  // Build update query
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), product_id];
  
  await db.run(
    `UPDATE auto_ordering_config SET ${setClause}, updated_at = datetime('now') WHERE product_id = ?`,
    values
  );
  
  // Get updated config
  const config = await db.get(
    'SELECT * FROM auto_ordering_config WHERE product_id = ?',
    [product_id]
  );
  
  return {
    product_id,
    updated_preferences: config,
    message: 'Supplier preferences updated successfully'
  };
}

async function viewSupplierPerformance(supplierName: string, metric: string, db: any) {
  let whereClause = '';
  const params: any[] = [];
  
  if (supplierName) {
    whereClause = 'WHERE s.name LIKE ?';
    params.push(`%${supplierName}%`);
  }
  
  const performance = await db.all(`
    SELECT 
      s.name,
      s.lead_time,
      s.delivery_schedule,
      COUNT(spp.id) as products_supplied,
      AVG(spp.price) as avg_price,
      AVG(spp.quality_score) as avg_quality,
      COUNT(po.id) as total_orders,
      SUM(po.total_cost) as total_value
    FROM suppliers s
    LEFT JOIN supplier_product_pricing spp ON s.id = spp.supplier_id
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id
    ${whereClause}
    GROUP BY s.id
    ORDER BY avg_quality DESC, avg_price ASC
  `, params);
  
  return {
    suppliers: performance,
    metric_focus: metric,
    summary: {
      total_suppliers: performance.length,
      avg_quality_across_all: performance.reduce((sum: number, s: any) => sum + (s.avg_quality || 0), 0) / performance.length
    }
  };
}

async function sendLowStockAlerts(productId: number | undefined, tenantId: number, db: any) {
  let products;
  
  if (productId) {
    products = await db.all(
      'SELECT id, name FROM products WHERE id = ? AND current_stock <= reorder_point',
      [productId]
    );
  } else {
    products = await db.all(
      'SELECT id, name FROM products WHERE tenant_id = ? AND current_stock <= reorder_point',
      [tenantId]
    );
  }
  
  const results = [];
  
  for (const product of products) {
    const sent = await sendLowStockAlert(product.id);
    results.push({
      product_id: product.id,
      product_name: product.name,
      alert_sent: sent
    });
  }
  
  return {
    alerts_sent: results.filter(r => r.alert_sent).length,
    alerts_failed: results.filter(r => !r.alert_sent).length,
    details: results
  };
}