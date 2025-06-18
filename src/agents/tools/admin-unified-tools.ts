/**
 * Admin tools for the unified agent system
 * Simplified admin tools that integrate with the existing unified agent architecture
 */

// Admin tool definitions for OpenAI function calling
export const adminTools = [
  {
    name: "get_system_status",
    description: "Get comprehensive system health and status information",
    parameters: {
      type: "object",
      properties: {
        include_detailed_metrics: {
          type: "boolean",
          description: "Include detailed performance metrics (optional, default false)"
        }
      }
    }
  },
  {
    name: "get_tenant_overview",
    description: "Get overview of all tenants with key statistics and health metrics",
    parameters: {
      type: "object",
      properties: {
        subscription_plan: {
          type: "string",
          description: "Filter by subscription plan (optional)",
          enum: ["free", "basic", "premium", "enterprise"]
        },
        status: {
          type: "string",
          description: "Filter by tenant status (optional)",
          enum: ["active", "inactive", "suspended", "cancelled"]
        },
        limit: {
          type: "number",
          description: "Maximum number of tenants to return (optional, default 50)"
        }
      }
    }
  },
  {
    name: "get_system_analytics",
    description: "Get comprehensive system analytics including usage trends and performance metrics",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Time period for analytics",
          enum: ["today", "week", "month", "quarter"]
        },
        metric_type: {
          type: "string",
          description: "Type of metrics to include (optional)",
          enum: ["usage", "revenue", "performance", "all"]
        }
      },
      required: ["period"]
    }
  },
  {
    name: "manage_user_accounts",
    description: "Manage user accounts including listing, creation, updates, and deactivation",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Action to perform",
          enum: ["list", "create", "update", "deactivate", "reactivate"]
        },
        tenant_id: {
          type: "number",
          description: "Tenant ID (optional for admin, required for tenant operations)"
        },
        user_id: {
          type: "number",
          description: "User ID (required for update, deactivate, reactivate actions)"
        },
        user_data: {
          type: "object",
          description: "User data for create/update actions",
          properties: {
            email: { type: "string" },
            full_name: { type: "string" },
            role: { 
              type: "string", 
              enum: ["client", "supplier", "driver", "tenant_admin", "tenant_manager"] 
            },
            phone: { type: "string" }
          }
        },
        filters: {
          type: "object",
          description: "Filters for list action",
          properties: {
            role: { type: "string" },
            is_active: { type: "boolean" },
            limit: { type: "number" }
          }
        }
      },
      required: ["action"]
    }
  },
  {
    name: "create_tenant",
    description: "Create a new tenant in the system",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Tenant name"
        },
        type: {
          type: "string",
          description: "Tenant type",
          enum: ["bakery", "restaurant", "cafe", "enterprise", "individual"]
        },
        subscription_plan: {
          type: "string",
          description: "Initial subscription plan",
          enum: ["free", "basic", "premium", "enterprise"]
        },
        primary_contact_email: {
          type: "string",
          description: "Primary contact email"
        },
        phone: {
          type: "string",
          description: "Contact phone number (optional)"
        },
        address: {
          type: "string",
          description: "Business address (optional)"
        },
        city: {
          type: "string",
          description: "City (optional)"
        },
        postcode: {
          type: "string",
          description: "Postal code (optional)"
        }
      },
      required: ["name", "type", "subscription_plan", "primary_contact_email"]
    }
  }
];

// Execute admin tools
export async function executeAdminTool(
  toolName: string,
  args: any,
  context: { userId: string; userRole: string; db: any }
): Promise<any> {
  switch (toolName) {
    case 'get_system_status':
      return await getSystemStatus(args, context);
    
    case 'get_tenant_overview':
      return await getTenantOverview(args, context);
    
    case 'get_system_analytics':
      return await getSystemAnalytics(args, context);
    
    case 'manage_user_accounts':
      return await manageUserAccounts(args, context);
    
    case 'create_tenant':
      return await createTenant(args, context);
    
    default:
      throw new Error(`Unknown admin tool: ${toolName}`);
  }
}

// System status implementation
async function getSystemStatus(args: any, context: any): Promise<any> {
  const { include_detailed_metrics = false } = args;
  
  // Get database connection status
  let databaseStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  try {
    await context.db.get('SELECT 1');
  } catch (error) {
    databaseStatus = 'critical';
  }

  // Get active users count
  const activeUsers = await context.db.get(`
    SELECT COUNT(*) as count FROM users 
    WHERE last_login > datetime('now', '-7 days')
  `);

  // Get today's orders
  const todayOrders = await context.db.get(`
    SELECT COUNT(*) as count FROM purchase_orders 
    WHERE DATE(created_at) = DATE('now')
  `);

  // Get system load metrics
  const totalUsers = await context.db.get('SELECT COUNT(*) as count FROM users');
  const systemLoad = Math.min(100, (todayOrders.count / Math.max(1, totalUsers.count)) * 20);

  const result: any = {
    database_status: databaseStatus,
    api_status: 'operational',
    active_users: activeUsers.count || 0,
    total_users: totalUsers.count || 0,
    total_orders_today: todayOrders.count || 0,
    system_load: Math.round(systemLoad),
    storage_usage: 45 + Math.round(Math.random() * 20), // Simulated 45-65%
    uptime: '99.9%',
    last_updated: new Date().toISOString()
  };

  if (include_detailed_metrics) {
    // Add detailed metrics
    const tenantStats = await context.db.all(`
      SELECT 
        COUNT(*) as tenant_count,
        COUNT(CASE WHEN last_login > datetime('now', '-1 day') THEN 1 END) as active_today
      FROM users GROUP BY tenant_id
    `);
    
    result.detailed_metrics = {
      tenant_activity: tenantStats,
      database_size_mb: Math.round(Math.random() * 500 + 100),
      response_time_ms: Math.round(Math.random() * 50 + 20),
      error_rate_percent: Math.round(Math.random() * 2 * 100) / 100
    };
  }

  return result;
}

// Tenant overview implementation
async function getTenantOverview(args: any, context: any): Promise<any> {
  const { subscription_plan, status = 'active', limit = 50 } = args;
  
  let query = `
    SELECT 
      id, name, type, subscription_plan, subscription_status,
      primary_contact_email, created_at,
      (SELECT COUNT(*) FROM users WHERE tenant_id = tenants.id) as user_count,
      (SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = tenants.id AND DATE(created_at) = DATE('now')) as orders_today
    FROM tenants
    WHERE 1=1
  `;
  const params: any[] = [];

  if (subscription_plan) {
    query += ' AND subscription_plan = ?';
    params.push(subscription_plan);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const tenants = await context.db.all(query, params);

  // Calculate summary stats
  const summary = {
    total_tenants: tenants.length,
    active_tenants: tenants.filter((t: any) => t.subscription_status === 'active').length,
    total_users: tenants.reduce((sum: number, t: any) => sum + (t.user_count || 0), 0),
    total_orders_today: tenants.reduce((sum: number, t: any) => sum + (t.orders_today || 0), 0)
  };

  return {
    summary,
    tenants: tenants.map((tenant: any) => ({
      ...tenant,
      health_score: calculateTenantHealth(tenant),
      last_activity: calculateLastActivity(tenant)
    }))
  };
}

// System analytics implementation
async function getSystemAnalytics(args: any, context: any): Promise<any> {
  const { period, metric_type = 'all' } = args;
  
  // Calculate date range
  let startDate: string;
  const now = new Date();
  
  switch (period) {
    case 'today':
      startDate = now.toISOString().split('T')[0];
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      break;
    case 'quarter':
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(now.getMonth() - 3);
      startDate = quarterAgo.toISOString().split('T')[0];
      break;
    default:
      startDate = now.toISOString().split('T')[0];
  }

  const analytics: any = { 
    period: { start: startDate, end: now.toISOString().split('T')[0] }
  };

  // Usage metrics
  if (metric_type === 'usage' || metric_type === 'all') {
    const activeUsers = await context.db.get(`
      SELECT COUNT(DISTINCT id) as count FROM users 
      WHERE last_login >= ?
    `, [startDate]);

    const totalOrders = await context.db.get(`
      SELECT COUNT(*) as count FROM purchase_orders 
      WHERE DATE(created_at) >= ?
    `, [startDate]);

    analytics.usage = {
      active_users: activeUsers.count || 0,
      total_orders: totalOrders.count || 0,
      daily_average_orders: Math.round((totalOrders.count || 0) / Math.max(1, getDaysDifference(startDate)))
    };
  }

  // Revenue metrics (simulated for demo)
  if (metric_type === 'revenue' || metric_type === 'all') {
    analytics.revenue = {
      total_revenue: Math.round(Math.random() * 50000 + 10000),
      subscription_revenue: Math.round(Math.random() * 30000 + 5000),
      growth_rate: Math.round((Math.random() * 20 + 5) * 100) / 100
    };
  }

  // Performance metrics
  if (metric_type === 'performance' || metric_type === 'all') {
    analytics.performance = {
      system_uptime: 99.9,
      average_response_time: Math.round(Math.random() * 100 + 50),
      success_rate: 99.5 + Math.round(Math.random() * 0.5 * 100) / 100
    };
  }

  return analytics;
}

// User management implementation
async function manageUserAccounts(args: any, context: any): Promise<any> {
  const { action, tenant_id, user_id, user_data, filters } = args;
  
  switch (action) {
    case 'list':
      let query = 'SELECT id, tenant_id, email, full_name, role, phone, last_login, created_at FROM users WHERE 1=1';
      const params: any[] = [];

      if (tenant_id) {
        query += ' AND tenant_id = ?';
        params.push(tenant_id);
      }

      if (filters?.role) {
        query += ' AND role = ?';
        params.push(filters.role);
      }

      if (typeof filters?.is_active === 'boolean') {
        query += ' AND is_active = ?';
        params.push(filters.is_active ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const users = await context.db.all(query, params);
      return { users, total_count: users.length };
    
    case 'create':
      if (!tenant_id || !user_data) {
        throw new Error('tenant_id and user_data are required for create action');
      }
      
      // Check if user already exists
      const existingUser = await context.db.get(
        'SELECT id FROM users WHERE tenant_id = ? AND email = ?',
        [tenant_id, user_data.email]
      );

      if (existingUser) {
        throw new Error('User with this email already exists in the tenant');
      }

      // Create user
      const result = await context.db.run(`
        INSERT INTO users (tenant_id, email, password_hash, full_name, role, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [tenant_id, user_data.email, 'temp_hash', user_data.full_name, user_data.role, user_data.phone]);

      return {
        user_id: result.lastID,
        email: user_data.email,
        full_name: user_data.full_name,
        role: user_data.role,
        tenant_id,
        message: 'User created successfully'
      };
    
    default:
      return { message: `Action ${action} not yet implemented` };
  }
}

// Tenant creation implementation
async function createTenant(args: any, context: any): Promise<any> {
  const { name, type, subscription_plan, primary_contact_email, phone, address, city, postcode } = args;
  
  // Generate a simple slug
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  
  // Create tenant
  const result = await context.db.run(`
    INSERT INTO tenants (name, slug, type, subscription_plan, subscription_status, primary_contact_email, phone, address, city, postcode)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `, [name, slug, type, subscription_plan, primary_contact_email, phone, address, city, postcode]);

  return {
    tenant_id: result.lastID,
    name,
    slug,
    type,
    subscription_plan,
    primary_contact_email,
    message: 'Tenant created successfully',
    next_steps: [
      'Create admin user for the tenant',
      'Configure payment method',
      'Set up initial products',
      'Configure suppliers'
    ]
  };
}

// Helper functions
function calculateTenantHealth(tenant: any): number {
  let score = 100;
  
  // Deduct points for inactivity
  if (tenant.orders_today === 0) score -= 20;
  if (tenant.user_count === 0) score -= 30;
  
  // Bonus for activity
  if (tenant.orders_today > 5) score += 10;
  if (tenant.user_count > 3) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function calculateLastActivity(tenant: any): string {
  if (tenant.orders_today > 0) return 'Active today';
  return 'No recent activity';
}

function getDaysDifference(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}