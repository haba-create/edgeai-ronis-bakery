import { NextApiRequest, NextApiResponse } from 'next';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get business data for context
    const db = await getDb();
    const businessData = await getBusinessData(db);

    // Execute the unified agent with admin/owner context
    const result = await executeUnifiedAgent(
      message, 
      context?.sessionId || 'owner-session', 
      'admin'  // Use admin role for owner interactions
    );

    // Generate business insights based on the query
    const insights = await generateBusinessInsights(message, businessData);

    res.status(200).json({
      response: result.response,
      insights,
      fallbackMode: result.fallbackMode
    });
  } catch (error) {
    console.error('Owner agent error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      response: "I'm sorry, I'm having trouble accessing your business data right now. Please try again or check the individual dashboard sections."
    });
  }
}

async function getBusinessData(db: any) {
  try {
    // Get key business metrics
    const [productCount, lowStockCount, pendingOrders, totalInventoryValue] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM products'),
      db.get('SELECT COUNT(*) as count FROM products WHERE current_stock <= reorder_point'),
      db.get('SELECT COUNT(*) as count FROM purchase_orders WHERE status = "pending"'),
      db.get('SELECT SUM(current_stock * price) as total FROM products WHERE price IS NOT NULL')
    ]);

    // Get top products by consumption
    const topProducts = await db.all(`
      SELECT name, daily_usage, current_stock, reorder_point 
      FROM products 
      WHERE daily_usage > 0 
      ORDER BY daily_usage DESC 
      LIMIT 5
    `);

    // Get recent orders
    const recentOrders = await db.all(`
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.order_date DESC
      LIMIT 5
    `);

    return {
      productCount: productCount?.count || 0,
      lowStockCount: lowStockCount?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
      totalInventoryValue: totalInventoryValue?.total || 0,
      topProducts: topProducts || [],
      recentOrders: recentOrders || []
    };
  } catch (error) {
    console.error('Error getting business data:', error);
    return {
      productCount: 0,
      lowStockCount: 0,
      pendingOrders: 0,
      totalInventoryValue: 0,
      topProducts: [],
      recentOrders: []
    };
  }
}

function generateBusinessInsights(message: string, businessData: any) {
  const insights = [];
  const messageLower = message.toLowerCase();

  // Performance insights
  if (messageLower.includes('performance') || messageLower.includes('sales') || messageLower.includes('today')) {
    insights.push({
      type: 'metric',
      title: 'Inventory Value',
      value: `£${businessData.totalInventoryValue.toLocaleString()}`,
      description: 'Current total value of your inventory',
      action: 'View detailed breakdown'
    });
  }

  // Stock alerts
  if (messageLower.includes('stock') || messageLower.includes('inventory') || messageLower.includes('reorder')) {
    if (businessData.lowStockCount > 0) {
      insights.push({
        type: 'alert',
        title: 'Low Stock Alert',
        value: `${businessData.lowStockCount} items`,
        description: 'Products below reorder point need immediate attention',
        action: 'Create reorder list'
      });
    }
  }

  // Order insights
  if (messageLower.includes('order') || messageLower.includes('supplier')) {
    if (businessData.pendingOrders > 0) {
      insights.push({
        type: 'recommendation',
        title: 'Pending Orders',
        value: `${businessData.pendingOrders} orders`,
        description: 'Orders awaiting supplier confirmation or delivery',
        action: 'Review pending orders'
      });
    }
  }

  // Trend insights
  if (messageLower.includes('trend') || messageLower.includes('popular') || messageLower.includes('top')) {
    if (businessData.topProducts.length > 0) {
      const topProduct = businessData.topProducts[0];
      insights.push({
        type: 'metric',
        title: 'Top Consumed Product',
        value: topProduct.name,
        description: `Daily usage: ${topProduct.daily_usage} units`,
        action: 'View consumption analysis'
      });
    }
  }

  return insights;
}