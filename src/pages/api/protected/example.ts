import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, requireTenantAccess } from '@/utils/auth';
import { getDb } from '@/utils/db';

/**
 * Example protected endpoint demonstrating:
 * 1. Authentication requirement
 * 2. Role-based access control
 * 3. Multi-tenant data isolation
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Example 1: Require authentication (any authenticated user)
    const session = await requireAuth(req, res);
    if (!session) return; // Response already sent by requireAuth

    // Example 2: Require specific roles
    // const session = await requireAuth(req, res, ['admin', 'supplier']);
    // if (!session) return;

    // Example 3: Require tenant access (for supplier-specific endpoints)
    // const supplierId = parseInt(req.query.supplierId as string);
    // const session = await requireTenantAccess(req, res, supplierId);
    // if (!session) return;

    const db = await getDb();
    let data;

    // Fetch data based on user role and tenant
    switch (session.user.role) {
      case 'admin':
        // Admins can see all data
        data = await db.all(`
          SELECT COUNT(*) as total_users FROM users
        `);
        break;
      
      case 'supplier':
        // Suppliers see only their tenant data
        data = await db.all(`
          SELECT 
            COUNT(*) as total_orders,
            SUM(total_cost) as total_revenue
          FROM purchase_orders
          WHERE supplier_id = ?
        `, [session.user.supplierId]);
        break;
      
      case 'driver':
        // Drivers see their assigned deliveries
        data = await db.all(`
          SELECT 
            COUNT(*) as total_deliveries
          FROM delivery_assignments
          WHERE driver_id = ?
        `, [session.user.id]);
        break;
      
      case 'client':
        // Clients see their own orders
        data = await db.all(`
          SELECT 
            COUNT(*) as total_orders,
            SUM(total_amount) as total_spent
          FROM client_orders
          WHERE user_id = ?
        `, [session.user.id]);
        break;
    }

    return res.status(200).json({
      message: 'Protected data accessed successfully',
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        supplierId: session.user.supplierId
      },
      data
    });

  } catch (error) {
    console.error('Protected endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}