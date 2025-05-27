import { NextApiRequest, NextApiResponse } from 'next';
import { getStockAlerts, getConsumptionTrends } from '@/services/productService';
import { getPendingOrders } from '@/services/orderService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Run multiple queries in parallel for dashboard data
      const [alerts, pendingOrders, trends] = await Promise.all([
        getStockAlerts(),
        getPendingOrders(),
        getConsumptionTrends()
      ]);
      
      // Calculate some stats
      const criticalAlerts = alerts.filter(alert => alert.priority === 'high').length;
      const stockOutRisk = alerts.filter(alert => 
        alert.product.days_until_stockout < 3 && alert.product.days_until_stockout > 0
      ).length;
      
      const expectedDeliveries = pendingOrders.filter(order => 
        order.status === 'shipped' || order.status === 'confirmed'
      ).length;
      
      return res.status(200).json({ 
        alerts,
        pendingOrders,
        trends,
        stats: {
          criticalAlerts,
          stockOutRisk,
          pendingOrders: pendingOrders.length,
          expectedDeliveries
        }
      });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling dashboard request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
