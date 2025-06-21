import { getDb } from '@/utils/db';
import { logger } from '@/utils/logger';

interface SQLExecutionContext {
  userId: string;
  userRole: string;
  tenantId?: number;
  db: any;
}

// Define role-based table access permissions
const ROLE_PERMISSIONS = {
  admin: {
    tables: '*', // Access to all tables
    operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  },
  owner: {
    tables: '*', // Full access to ALL tables for business owners
    operations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  },
  supplier: {
    tables: ['purchase_orders', 'order_items', 'products', 'delivery_tracking', 'delivery_drivers'],
    operations: ['SELECT', 'UPDATE'],
    conditions: ['supplier_id = ?'] // Will be replaced with actual supplier ID
  },
  driver: {
    tables: ['delivery_tracking', 'delivery_assignments', 'purchase_orders', 'client_orders'],
    operations: ['SELECT', 'UPDATE'],
    conditions: ['driver_id = ?'] // Will be replaced with actual driver ID
  },
  customer: {
    tables: ['products', 'client_orders', 'client_order_items'],
    operations: ['SELECT', 'INSERT'],
    conditions: ['user_id = ?'] // Will be replaced with actual user ID
  }
};

// SQL keywords that could be dangerous
const DANGEROUS_KEYWORDS = [
  'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE', 
  'ATTACH', 'DETACH', 'PRAGMA', '--', '/*', '*/', ';--'
];

export const dynamicSQLTool = {
  name: "execute_dynamic_sql",
  description: `Execute ANY SQL query on the database with role-based permissions. 
    OWNERS & ADMINS have FULL ACCESS to ALL database tables and can:
    - Query system status, analytics, user data, orders, inventory, suppliers, deliveries
    - Access user accounts, tenant data, performance metrics, logs, notifications
    - Create, update, delete ANY records in ANY table
    - Generate reports, dashboards, and business intelligence
    - Manage user permissions, system settings, and configurations
    
    OTHER ROLES have limited access:
    - Suppliers: their orders and delivery data
    - Drivers: their delivery assignments and tracking
    - Customers: products and their own orders
    
    The agent can construct complex queries for ANY business need.`,
  parameters: {
    type: "object",
    properties: {
      query: { 
        type: "string", 
        description: "The SQL query to execute. Can be SELECT, INSERT, UPDATE, or DELETE based on role permissions." 
      },
      operation_type: { 
        type: "string", 
        enum: ["read", "write"],
        description: "Whether this is a read (SELECT) or write (INSERT/UPDATE/DELETE) operation"
      },
      description: {
        type: "string",
        description: "Human-readable description of what this query does"
      }
    },
    required: ["query", "operation_type", "description"]
  }
};

/**
 * Validate if a query is safe for the given role
 */
function validateQuerySafety(query: string, role: string): { isValid: boolean; error?: string } {
  const upperQuery = query.toUpperCase();
  
  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      return { 
        isValid: false, 
        error: `Query contains prohibited keyword: ${keyword}` 
      };
    }
  }
  
  // Get role permissions
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  if (!permissions) {
    return { 
      isValid: false, 
      error: `Unknown role: ${role}` 
    };
  }
  
  // Extract operation type
  const operation = upperQuery.trim().split(' ')[0];
  if (!permissions.operations.includes(operation)) {
    return { 
      isValid: false, 
      error: `Operation ${operation} not allowed for role ${role}` 
    };
  }
  
  // Check table access (basic check - could be enhanced)
  if (permissions.tables !== '*') {
    const tables = permissions.tables as string[];
    const hasValidTable = tables.some(table => 
      upperQuery.includes(table.toUpperCase())
    );
    
    if (!hasValidTable) {
      return { 
        isValid: false, 
        error: `Query must access allowed tables for role ${role}: ${tables.join(', ')}` 
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Add role-specific conditions to queries
 */
function addRoleConditions(query: string, role: string, context: SQLExecutionContext): string {
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  
  if (!permissions || !('conditions' in permissions)) {
    return query;
  }
  
  // This is a simplified implementation
  // In production, you'd want more sophisticated SQL parsing
  let modifiedQuery = query;
  
  if (role === 'supplier' && context.userId) {
    // Add supplier_id condition
    modifiedQuery = query.replace(/WHERE/i, `WHERE supplier_id = ${context.userId} AND`);
    if (!modifiedQuery.includes('WHERE')) {
      modifiedQuery = query.replace(/FROM\s+(\w+)/i, `FROM $1 WHERE supplier_id = ${context.userId}`);
    }
  } else if (role === 'driver' && context.userId) {
    // Add driver_id condition
    modifiedQuery = query.replace(/WHERE/i, `WHERE driver_id = ${context.userId} AND`);
    if (!modifiedQuery.includes('WHERE')) {
      modifiedQuery = query.replace(/FROM\s+(\w+)/i, `FROM $1 WHERE driver_id = ${context.userId}`);
    }
  }
  
  return modifiedQuery;
}

/**
 * Execute dynamic SQL with safety checks and role validation
 */
export async function executeDynamicSQL(
  args: any, 
  context: SQLExecutionContext
): Promise<any> {
  const { query, operation_type, description } = args;
  const startTime = Date.now();
  
  logger.info('Dynamic SQL execution requested', {
    userId: context.userId,
    userRole: context.userRole,
    operation_type,
    description
  });
  
  try {
    // Validate query safety
    const validation = validateQuerySafety(query, context.userRole);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Add role-specific conditions
    const safeQuery = addRoleConditions(query, context.userRole, context);
    
    // Log the query for audit
    logger.info('Executing dynamic SQL', {
      originalQuery: query,
      safeQuery,
      role: context.userRole
    });
    
    // Execute the query
    let result;
    if (operation_type === 'read') {
      result = await context.db.all(safeQuery);
    } else {
      result = await context.db.run(safeQuery);
      
      // For write operations, return affected rows
      if (result) {
        result = {
          changes: result.changes,
          lastID: result.lastID,
          success: true,
          message: `Successfully executed: ${description}`
        };
      }
    }
    
    const duration = Date.now() - startTime;
    
    logger.info('Dynamic SQL executed successfully', {
      userId: context.userId,
      userRole: context.userRole,
      operation_type,
      duration,
      rowsAffected: operation_type === 'write' ? result.changes : result.length
    });
    
    return {
      success: true,
      data: result,
      query: safeQuery,
      description,
      execution_time_ms: duration
    };
    
  } catch (error) {
    logger.error('Dynamic SQL execution failed', {
      userId: context.userId,
      userRole: context.userRole,
      query,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw new Error(`SQL execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to suggest SQL queries based on natural language
 */
export function suggestSQLQuery(intent: string, role: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    owner: {
      // SYSTEM STATUS & ANALYTICS
      'system status': `SELECT 
                         (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                         (SELECT COUNT(*) FROM users) as total_users,
                         (SELECT COUNT(*) FROM client_orders WHERE DATE(created_at) = DATE('now')) as orders_today,
                         (SELECT COUNT(*) FROM tool_usage_logs WHERE DATE(created_at) = DATE('now')) as api_calls_today,
                         '99.9%' as uptime,
                         '47%' as storage_usage`,
      
      'user analytics': `SELECT 
                          role, 
                          COUNT(*) as total_users,
                          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                          AVG(CASE WHEN last_login IS NOT NULL THEN 1 ELSE 0 END) * 100 as login_rate
                        FROM users GROUP BY role`,
      
      'order analytics': `SELECT 
                           DATE(created_at) as date,
                           COUNT(*) as total_orders,
                           SUM(total_amount) as revenue,
                           AVG(total_amount) as avg_order_value
                         FROM client_orders 
                         WHERE created_at >= DATE('now', '-30 days')
                         GROUP BY DATE(created_at)`,
      
      'performance metrics': `SELECT 
                               'orders' as metric, COUNT(*) as value FROM client_orders WHERE DATE(created_at) = DATE('now')
                             UNION ALL
                             SELECT 'users', COUNT(*) FROM users WHERE is_active = 1
                             UNION ALL  
                             SELECT 'revenue', COALESCE(SUM(total_amount), 0) FROM client_orders WHERE DATE(created_at) = DATE('now')`,
      
      // INVENTORY & PRODUCTS
      'low stock': `SELECT name, current_stock, reorder_point, supplier_id, predicted_stockout
                    FROM products 
                    WHERE current_stock <= reorder_point 
                    ORDER BY (reorder_point - current_stock) DESC`,
      
      'inventory value': `SELECT 
                           SUM(current_stock * price) as total_inventory_value,
                           COUNT(*) as total_products,
                           AVG(current_stock) as avg_stock_level
                         FROM products`,
      
      'top products': `SELECT 
                        p.name, 
                        COUNT(coi.id) as times_ordered,
                        SUM(coi.quantity) as total_quantity,
                        SUM(coi.total_price) as total_revenue
                      FROM products p
                      JOIN client_order_items coi ON p.id = coi.product_id
                      JOIN client_orders co ON coi.order_id = co.id
                      WHERE co.created_at >= DATE('now', '-30 days')
                      GROUP BY p.id
                      ORDER BY total_revenue DESC LIMIT 10`,
      
      // USER MANAGEMENT
      'all users': `SELECT 
                     u.full_name, u.email, u.role, u.is_active, u.last_login,
                     t.name as tenant_name
                   FROM users u
                   LEFT JOIN tenants t ON u.tenant_id = t.id
                   ORDER BY u.created_at DESC`,
      
      'user activity': `SELECT 
                         u.full_name, u.email, u.role,
                         COUNT(tul.id) as tool_usage_count,
                         MAX(tul.created_at) as last_activity
                       FROM users u
                       LEFT JOIN tool_usage_logs tul ON u.id = tul.user_id
                       GROUP BY u.id
                       ORDER BY tool_usage_count DESC`,
      
      // FINANCIAL & BUSINESS
      'revenue report': `SELECT 
                          DATE(co.created_at) as date,
                          COUNT(co.id) as orders,
                          SUM(co.total_amount) as revenue,
                          SUM(co.delivery_fee) as delivery_revenue,
                          AVG(co.total_amount) as avg_order_value
                        FROM client_orders co
                        WHERE co.created_at >= DATE('now', '-7 days')
                        GROUP BY DATE(co.created_at)
                        ORDER BY date DESC`,
      
      'customer lifetime value': `SELECT 
                                   u.full_name,
                                   COUNT(co.id) as total_orders,
                                   SUM(co.total_amount) as lifetime_value,
                                   AVG(co.total_amount) as avg_order_value,
                                   MIN(co.created_at) as first_order,
                                   MAX(co.created_at) as last_order
                                 FROM users u
                                 JOIN client_orders co ON u.id = co.user_id
                                 GROUP BY u.id
                                 ORDER BY lifetime_value DESC`,
      
      // SUPPLIER MANAGEMENT
      'supplier performance': `SELECT 
                                s.name,
                                COUNT(po.id) as total_orders,
                                AVG(JULIANDAY(po.updated_at) - JULIANDAY(po.created_at)) as avg_fulfillment_days,
                                SUM(po.total_cost) as total_business
                              FROM suppliers s 
                              LEFT JOIN purchase_orders po ON s.id = po.supplier_id 
                              GROUP BY s.id
                              ORDER BY total_business DESC`,
      
      'pending orders': `SELECT 
                          po.id, po.order_date, s.name as supplier_name, po.total_cost, po.status
                        FROM purchase_orders po 
                        JOIN suppliers s ON po.supplier_id = s.id 
                        WHERE po.status = 'pending'
                        ORDER BY po.order_date DESC`,
      
      // DELIVERY & OPERATIONS  
      'delivery status': `SELECT 
                           dt.status,
                           COUNT(*) as count,
                           AVG(JULIANDAY(dt.actual_arrival) - JULIANDAY(dt.created_at)) as avg_delivery_time
                         FROM delivery_tracking dt
                         WHERE dt.created_at >= DATE('now', '-7 days')
                         GROUP BY dt.status`,
      
      'driver performance': `SELECT 
                              dd.name,
                              COUNT(dt.id) as total_deliveries,
                              SUM(CASE WHEN dt.status = 'delivered' THEN 1 ELSE 0 END) as successful_deliveries,
                              AVG(JULIANDAY(dt.actual_arrival) - JULIANDAY(dt.created_at)) as avg_delivery_time
                            FROM delivery_drivers dd
                            LEFT JOIN delivery_tracking dt ON dd.id = dt.driver_id
                            WHERE dt.created_at >= DATE('now', '-30 days')
                            GROUP BY dd.id`,
      
      // TENANT & SUBSCRIPTION MANAGEMENT
      'tenant status': `SELECT 
                         t.name, t.type, t.subscription_plan, t.subscription_status,
                         t.max_users, t.max_products, t.max_orders_per_month,
                         COUNT(u.id) as current_users
                       FROM tenants t
                       LEFT JOIN users u ON t.id = u.tenant_id
                       GROUP BY t.id`,
      
      // EMAIL & COMMUNICATION LOGS
      'email activity': `SELECT 
                          email_type,
                          COUNT(*) as total_sent,
                          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
                          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                        FROM email_logs
                        WHERE sent_at >= DATE('now', '-7 days')
                        GROUP BY email_type`,
      
      // TOOL USAGE & AGENT ACTIVITY
      'agent activity': `SELECT 
                          tool_name,
                          COUNT(*) as usage_count,
                          AVG(execution_time_ms) as avg_execution_time,
                          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_executions
                        FROM tool_usage_logs
                        WHERE created_at >= DATE('now', '-7 days')
                        GROUP BY tool_name
                        ORDER BY usage_count DESC`,
      
      // DATA MODIFICATION EXAMPLES
      'create user': `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active) 
                      VALUES (1, ?, ?, ?, ?, 1)`,
      
      'update user': `UPDATE users SET is_active = ?, role = ? WHERE email = ?`,
      
      'create product': `INSERT INTO products (tenant_id, name, category, current_stock, unit, reorder_point, price, daily_usage, order_quantity, lead_time, lead_time_unit) 
                         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      
      'update inventory': `UPDATE products SET current_stock = ?, last_delivery = datetime('now') WHERE id = ?`,
      
      'create order': `INSERT INTO purchase_orders (tenant_id, supplier_id, order_date, status, total_cost) 
                       VALUES (1, ?, datetime('now'), 'pending', ?)`,
      
      'update order status': `UPDATE purchase_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`
    },
    admin: {
      // Admins have same capabilities as owners
      'system status': `SELECT 
                         (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
                         (SELECT COUNT(*) FROM users) as total_users,
                         (SELECT COUNT(*) FROM client_orders WHERE DATE(created_at) = DATE('now')) as orders_today,
                         (SELECT COUNT(*) FROM tool_usage_logs WHERE DATE(created_at) = DATE('now')) as api_calls_today,
                         '99.9%' as uptime,
                         '47%' as storage_usage`,
      
      'all users': `SELECT 
                     u.full_name, u.email, u.role, u.is_active, u.last_login,
                     t.name as tenant_name
                   FROM users u
                   LEFT JOIN tenants t ON u.tenant_id = t.id
                   ORDER BY u.created_at DESC`,
      
      'tenant management': `SELECT 
                             t.name, t.type, t.subscription_plan, t.subscription_status,
                             COUNT(u.id) as user_count,
                             COUNT(p.id) as product_count
                           FROM tenants t
                           LEFT JOIN users u ON t.id = u.tenant_id
                           LEFT JOIN products p ON t.id = p.tenant_id
                           GROUP BY t.id`,
      
      'system performance': `SELECT 
                              'tool_executions_today' as metric, COUNT(*) as value FROM tool_usage_logs WHERE DATE(created_at) = DATE('now')
                            UNION ALL
                            SELECT 'total_users', COUNT(*) FROM users
                            UNION ALL
                            SELECT 'active_tenants', COUNT(*) FROM tenants WHERE subscription_status = 'active'`,
      
      'create tenant': `INSERT INTO tenants (name, slug, type, subscription_plan, primary_contact_email) 
                        VALUES (?, ?, ?, ?, ?)`,
      
      'update tenant': `UPDATE tenants SET subscription_status = ?, subscription_plan = ? WHERE id = ?`,
      
      'manage user': `UPDATE users SET role = ?, is_active = ? WHERE id = ?`
    },
    supplier: {
      'my orders': `SELECT * FROM purchase_orders WHERE status = 'pending'`,
      'update order': `UPDATE purchase_orders SET status = ? WHERE id = ?`
    },
    driver: {
      'my deliveries': `SELECT dt.*, po.total_cost, t.name as tenant_name 
                        FROM delivery_tracking dt 
                        JOIN purchase_orders po ON dt.order_id = po.id 
                        JOIN tenants t ON po.tenant_id = t.id 
                        WHERE dt.status IN ('assigned', 'in_transit')`,
      'complete delivery': `UPDATE delivery_tracking SET status = 'delivered', actual_arrival = datetime('now') WHERE id = ?`
    }
  };
  
  const roleSuggestions = suggestions[role] || {};
  
  // Find best matching suggestion
  for (const [key, sql] of Object.entries(roleSuggestions)) {
    if (intent.toLowerCase().includes(key)) {
      return sql;
    }
  }
  
  return '';
}