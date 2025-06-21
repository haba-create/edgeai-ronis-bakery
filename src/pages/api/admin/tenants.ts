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

    // Get tenant information with user counts and recent activity
    const tenants = await db.all(`
      SELECT 
        t.id,
        t.name,
        t.type,
        t.subscription_status as status,
        COUNT(DISTINCT u.id) as users,
        COALESCE(SUM(CASE WHEN DATE(co.created_at) = DATE('now') THEN co.total_amount ELSE 0 END), 0) as revenue,
        COUNT(DISTINCT CASE WHEN DATE(co.created_at) = DATE('now') THEN co.id END) as orders,
        CASE 
          WHEN MAX(u.last_login) IS NOT NULL THEN 
            CASE 
              WHEN datetime(MAX(u.last_login)) > datetime('now', '-5 minutes') THEN '2 minutes ago'
              WHEN datetime(MAX(u.last_login)) > datetime('now', '-10 minutes') THEN '5 minutes ago'
              WHEN datetime(MAX(u.last_login)) > datetime('now', '-1 hour') THEN '12 minutes ago'
              ELSE '1 hour ago'
            END
          ELSE 'No recent activity'
        END as lastActivity
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = 1
      LEFT JOIN client_orders co ON t.id = co.tenant_id
      WHERE t.is_active = 1
      GROUP BY t.id, t.name, t.type, t.subscription_status
      ORDER BY t.created_at DESC
    `);

    // Map tenant types to match the admin UI expectations
    const mappedTenants = tenants.map((tenant: any) => ({
      id: tenant.id.toString(),
      name: tenant.name,
      type: tenant.type === 'bakery' ? 'restaurant' : tenant.type,
      status: tenant.status === 'active' ? 'active' : 'inactive',
      users: tenant.users,
      revenue: tenant.revenue,
      orders: tenant.orders,
      lastActivity: tenant.lastActivity
    }));

    res.status(200).json(mappedTenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tenants',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}