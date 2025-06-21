import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const db = await getDb();

    // Get total active users
    const totalUsers = await db.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE is_active = 1
    `);

    // Get active tenants
    const activeTenants = await db.get(`
      SELECT COUNT(*) as count FROM tenants 
      WHERE is_active = 1
    `);

    // Get today's orders
    const todayOrders = await db.get(`
      SELECT COUNT(*) as count FROM client_orders 
      WHERE DATE(created_at) = DATE('now')
    `);

    // Get total revenue for today (simplified calculation)
    const todayRevenue = await db.get(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM client_orders 
      WHERE DATE(created_at) = DATE('now') AND status = 'completed'
    `);

    // Get active users (logged in within last 7 days)
    const activeUsers = await db.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE is_active = 1 AND last_login > datetime('now', '-7 days')
    `);

    // Calculate percentage changes (mock data for now since we don't have historical data)
    const metrics = {
      totalUsers: {
        value: totalUsers.count.toString(),
        change: 12.5, // This would be calculated from historical data
        label: 'Total Users'
      },
      activeTenants: {
        value: activeTenants.count.toString(),
        change: 0,
        label: 'Active Tenants'
      },
      totalRevenue: {
        value: `£${(todayRevenue.total / 1000).toFixed(1)}K`,
        change: 8.3, // This would be calculated from historical data
        label: 'Revenue Today'
      },
      ordersToday: {
        value: todayOrders.count.toString(),
        change: -2.1, // This would be calculated from historical data
        label: 'Orders Today'
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system metrics',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}