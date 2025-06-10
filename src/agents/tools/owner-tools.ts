import { getDb } from '@/utils/db';

export const ownerTools = [
  {
    name: 'get_business_analytics',
    description: 'Get comprehensive business analytics and performance metrics',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period (today, week, month, quarter)'
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metrics to include (sales, inventory, orders, trends)'
        }
      }
    }
  },
  {
    name: 'analyze_inventory_health',
    description: 'Analyze inventory levels, identify issues, and provide recommendations',
    parameters: {
      type: 'object',
      properties: {
        focus_area: {
          type: 'string',
          description: 'Specific area to analyze (stock_levels, consumption, turnover, costs)'
        }
      }
    }
  },
  {
    name: 'get_reorder_recommendations',
    description: 'Get intelligent reorder recommendations based on consumption patterns',
    parameters: {
      type: 'object',
      properties: {
        urgency: {
          type: 'string',
          description: 'Urgency level (immediate, soon, planned)'
        },
        category: {
          type: 'string',
          description: 'Product category to focus on'
        }
      }
    }
  },
  {
    name: 'analyze_supplier_performance',
    description: 'Analyze supplier performance and relationships',
    parameters: {
      type: 'object',
      properties: {
        supplier_id: {
          type: 'number',
          description: 'Specific supplier to analyze (optional)'
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Performance metrics (delivery_time, quality, cost, reliability)'
        }
      }
    }
  },
  {
    name: 'generate_cost_optimization',
    description: 'Generate cost optimization recommendations',
    parameters: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          description: 'Optimization focus (inventory, suppliers, operations, waste)'
        }
      }
    }
  },
  {
    name: 'get_consumption_trends',
    description: 'Analyze product consumption trends and patterns',
    parameters: {
      type: 'object',
      properties: {
        timeframe: {
          type: 'string',
          description: 'Analysis timeframe (daily, weekly, monthly)'
        },
        top_n: {
          type: 'number',
          description: 'Number of top products to analyze'
        }
      }
    }
  }
];

export async function executeOwnerTool(toolName: string, parameters: any, context: any) {
  const db = await getDb();
  
  try {
    switch (toolName) {
      case 'get_business_analytics':
        return await getBusinessAnalytics(db, parameters);
      case 'analyze_inventory_health':
        return await analyzeInventoryHealth(db, parameters);
      case 'get_reorder_recommendations':
        return await getReorderRecommendations(db, parameters);
      case 'analyze_supplier_performance':
        return await analyzeSupplierPerformance(db, parameters);
      case 'generate_cost_optimization':
        return await generateCostOptimization(db, parameters);
      case 'get_consumption_trends':
        return await getConsumptionTrends(db, parameters);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing owner tool ${toolName}:`, error);
    return { error: 'Failed to execute tool' };
  }
}

async function getBusinessAnalytics(db: any, { period = 'today', metrics = [] }: any) {
  const analytics: any = {};
  
  // Basic inventory metrics
  const inventoryStats = await db.get(`
    SELECT 
      COUNT(*) as total_products,
      COUNT(CASE WHEN current_stock <= reorder_point THEN 1 END) as low_stock_count,
      COUNT(CASE WHEN current_stock <= reorder_point * 0.5 THEN 1 END) as critical_stock_count,
      SUM(current_stock * COALESCE(price, 0)) as total_inventory_value,
      AVG(current_stock) as avg_stock_level
    FROM products
  `);
  
  analytics.inventory = inventoryStats;
  
  // Order metrics
  const orderStats = await db.get(`
    SELECT 
      COUNT(*) as total_orders,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
      AVG(CASE WHEN total_cost > 0 THEN total_cost END) as avg_order_value
    FROM purchase_orders
  `);
  
  analytics.orders = orderStats;
  
  // Top consuming products
  const topProducts = await db.all(`
    SELECT name, daily_usage, current_stock, category
    FROM products
    WHERE daily_usage > 0
    ORDER BY daily_usage DESC
    LIMIT 5
  `);
  
  analytics.top_consumption = topProducts;
  
  // Supplier count
  const supplierCount = await db.get('SELECT COUNT(*) as count FROM suppliers');
  analytics.supplier_count = supplierCount.count;
  
  return {
    analytics,
    period,
    generated_at: new Date().toISOString(),
    summary: `Business analytics for ${period}: ${inventoryStats.total_products} products, ${orderStats.pending_orders} pending orders, £${inventoryStats.total_inventory_value?.toFixed(2) || '0'} inventory value`
  };
}

async function analyzeInventoryHealth(db: any, { focus_area }: any) {
  const health_analysis: any = {};
  
  // Stock level analysis
  const stockLevels = await db.all(`
    SELECT 
      name,
      category,
      current_stock,
      optimal_stock,
      reorder_point,
      daily_usage,
      CASE 
        WHEN current_stock <= reorder_point * 0.5 THEN 'critical'
        WHEN current_stock <= reorder_point THEN 'low'
        WHEN current_stock > optimal_stock * 1.5 THEN 'overstocked'
        ELSE 'healthy'
      END as health_status,
      CASE 
        WHEN daily_usage > 0 THEN ROUND(current_stock / daily_usage, 1)
        ELSE NULL
      END as days_remaining
    FROM products
    ORDER BY 
      CASE health_status
        WHEN 'critical' THEN 1
        WHEN 'low' THEN 2
        WHEN 'overstocked' THEN 3
        ELSE 4
      END
  `);
  
  health_analysis.stock_analysis = stockLevels;
  
  // Category breakdown
  const categoryHealth = await db.all(`
    SELECT 
      category,
      COUNT(*) as total_products,
      COUNT(CASE WHEN current_stock <= reorder_point THEN 1 END) as low_stock_items,
      AVG(current_stock * COALESCE(price, 0)) as avg_category_value
    FROM products
    GROUP BY category
    ORDER BY low_stock_items DESC
  `);
  
  health_analysis.category_breakdown = categoryHealth;
  
  // Issues and recommendations
  const issues = [];
  const recommendations = [];
  
  const criticalItems = stockLevels.filter((item: any) => item.health_status === 'critical');
  const lowItems = stockLevels.filter((item: any) => item.health_status === 'low');
  const overstockedItems = stockLevels.filter((item: any) => item.health_status === 'overstocked');
  
  if (criticalItems.length > 0) {
    issues.push(`${criticalItems.length} items at critical stock levels`);
    recommendations.push('Immediate reordering required for critical items');
  }
  
  if (lowItems.length > 5) {
    issues.push(`${lowItems.length} items below reorder point`);
    recommendations.push('Review and optimize reorder points');
  }
  
  if (overstockedItems.length > 0) {
    issues.push(`${overstockedItems.length} items overstocked`);
    recommendations.push('Consider reducing order quantities for overstocked items');
  }
  
  return {
    health_analysis,
    issues,
    recommendations,
    overall_health: issues.length === 0 ? 'excellent' : issues.length <= 2 ? 'good' : 'needs_attention'
  };
}

async function getReorderRecommendations(db: any, { urgency, category }: any) {
  let sql = `
    SELECT 
      p.name,
      p.category,
      p.current_stock,
      p.reorder_point,
      p.order_quantity,
      p.daily_usage,
      p.price,
      s.name as supplier_name,
      s.id as supplier_id,
      CASE 
        WHEN p.daily_usage > 0 THEN ROUND(p.current_stock / p.daily_usage, 1)
        ELSE NULL
      END as days_remaining,
      CASE 
        WHEN p.current_stock <= p.reorder_point * 0.5 THEN 'immediate'
        WHEN p.current_stock <= p.reorder_point THEN 'soon'
        WHEN p.current_stock <= p.reorder_point * 1.2 THEN 'planned'
        ELSE 'not_needed'
      END as urgency_level
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.current_stock <= p.reorder_point * 1.2
  `;
  
  const params: any[] = [];
  
  if (urgency) {
    if (urgency === 'immediate') {
      sql += ` AND p.current_stock <= p.reorder_point * 0.5`;
    } else if (urgency === 'soon') {
      sql += ` AND p.current_stock <= p.reorder_point AND p.current_stock > p.reorder_point * 0.5`;
    }
  }
  
  if (category) {
    sql += ` AND p.category = ?`;
    params.push(category);
  }
  
  sql += ` ORDER BY urgency_level, days_remaining ASC`;
  
  const recommendations = await db.all(sql, params);
  
  // Group by supplier for efficient ordering
  const supplierGroups = recommendations.reduce((groups: any, item: any) => {
    const supplierId = item.supplier_id || 'unknown';
    if (!groups[supplierId]) {
      groups[supplierId] = {
        supplier_name: item.supplier_name || 'Unknown Supplier',
        items: [],
        total_cost: 0
      };
    }
    groups[supplierId].items.push(item);
    groups[supplierId].total_cost += (item.price || 0) * item.order_quantity;
    return groups;
  }, {});
  
  return {
    recommendations,
    supplier_groups: Object.values(supplierGroups),
    total_items: recommendations.length,
    summary: `${recommendations.length} items need reordering across ${Object.keys(supplierGroups).length} suppliers`
  };
}

async function analyzeSupplierPerformance(db: any, { supplier_id, metrics = [] }: any) {
  let suppliers;
  
  if (supplier_id) {
    suppliers = await db.all('SELECT * FROM suppliers WHERE id = ?', [supplier_id]);
  } else {
    suppliers = await db.all('SELECT * FROM suppliers ORDER BY name');
  }
  
  const performance = [];
  
  for (const supplier of suppliers) {
    // Get order statistics
    const orderStats = await db.get(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        AVG(total_cost) as avg_order_value,
        SUM(total_cost) as total_spent
      FROM purchase_orders
      WHERE supplier_id = ?
    `, [supplier.id]);
    
    // Get product count
    const productCount = await db.get(
      'SELECT COUNT(*) as count FROM products WHERE supplier_id = ?',
      [supplier.id]
    );
    
    const deliveryRate = orderStats.total_orders > 0 
      ? (orderStats.delivered_orders / orderStats.total_orders * 100).toFixed(1)
      : '0';
    
    const deliveryRateNum = parseFloat(deliveryRate);
    
    performance.push({
      supplier,
      stats: {
        ...orderStats,
        product_count: productCount.count,
        delivery_rate: deliveryRate,
        reliability_score: deliveryRateNum >= 95 ? 'excellent' : deliveryRateNum >= 85 ? 'good' : 'needs_improvement'
      }
    });
  }
  
  return {
    supplier_performance: performance,
    analysis_date: new Date().toISOString(),
    recommendations: performance
      .filter((p: any) => parseFloat(p.stats.delivery_rate) < 90)
      .map((p: any) => `Consider discussing delivery improvements with ${p.supplier.name}`)
  };
}

async function generateCostOptimization(db: any, { focus }: any) {
  const optimizations = [];
  
  // Identify expensive low-usage items
  const expensiveItems = await db.all(`
    SELECT name, price, daily_usage, current_stock * price as stock_value
    FROM products
    WHERE price > 10 AND daily_usage < 1
    ORDER BY price DESC
    LIMIT 10
  `);
  
  if (expensiveItems.length > 0) {
    optimizations.push({
      type: 'inventory_optimization',
      title: 'High-cost, low-usage items',
      items: expensiveItems,
      recommendation: 'Consider reducing order quantities or finding alternative suppliers for these expensive, slow-moving items'
    });
  }
  
  // Overstocked items
  const overstockedItems = await db.all(`
    SELECT name, current_stock, optimal_stock, (current_stock - optimal_stock) * price as excess_value
    FROM products
    WHERE current_stock > optimal_stock * 1.5 AND price > 0
    ORDER BY excess_value DESC
    LIMIT 10
  `);
  
  if (overstockedItems.length > 0) {
    optimizations.push({
      type: 'overstock_reduction',
      title: 'Overstocked items tying up capital',
      items: overstockedItems,
      recommendation: 'Reduce future orders for overstocked items to free up working capital'
    });
  }
  
  // Supplier consolidation opportunities
  const supplierAnalysis = await db.all(`
    SELECT 
      s.name,
      COUNT(p.id) as product_count,
      SUM(p.current_stock * p.price) as inventory_value
    FROM suppliers s
    LEFT JOIN products p ON s.id = p.supplier_id
    GROUP BY s.id, s.name
    HAVING product_count < 3 AND inventory_value < 1000
    ORDER BY product_count ASC
  `);
  
  if (supplierAnalysis.length > 0) {
    optimizations.push({
      type: 'supplier_consolidation',
      title: 'Small suppliers with low volume',
      suppliers: supplierAnalysis,
      recommendation: 'Consider consolidating orders with fewer suppliers to reduce administrative costs and potentially negotiate better rates'
    });
  }
  
  return {
    optimizations,
    total_opportunities: optimizations.length,
    potential_savings: 'Analysis complete - review specific recommendations for estimated savings'
  };
}

async function getConsumptionTrends(db: any, { timeframe = 'weekly', top_n = 10 }: any) {
  const trends = await db.all(`
    SELECT 
      name,
      category,
      daily_usage,
      current_stock,
      reorder_point,
      price,
      daily_usage * price as daily_cost,
      CASE 
        WHEN daily_usage > 5 THEN 'high'
        WHEN daily_usage > 1 THEN 'medium'
        ELSE 'low'
      END as usage_category
    FROM products
    WHERE daily_usage > 0
    ORDER BY daily_usage DESC
    LIMIT ?
  `, [top_n]);
  
  const categoryTrends = await db.all(`
    SELECT 
      category,
      COUNT(*) as product_count,
      SUM(daily_usage) as total_daily_usage,
      AVG(daily_usage) as avg_daily_usage,
      SUM(daily_usage * price) as daily_category_cost
    FROM products
    WHERE daily_usage > 0
    GROUP BY category
    ORDER BY total_daily_usage DESC
  `);
  
  return {
    product_trends: trends,
    category_trends: categoryTrends,
    timeframe,
    insights: {
      highest_usage: trends[0]?.name || 'No data',
      most_expensive_daily: trends.reduce((max: any, item: any) => 
        item.daily_cost > (max.daily_cost || 0) ? item : max, {}
      ),
      top_category: categoryTrends[0]?.category || 'No data'
    }
  };
}