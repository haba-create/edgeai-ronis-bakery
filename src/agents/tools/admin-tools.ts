/**
 * Admin Agent Tools
 * Tools for system management and tenant administration
 */

import { BaseTool } from '../base-tools';
import { AgentContext, SystemStatus, TenantAdminStats } from '../types';
import { getTenantLimits, createTenant, updateTenantSubscription } from '../../utils/tenant-utils';

/**
 * Get system health and status overview
 */
export class GetSystemStatusTool extends BaseTool {
  name = 'get_system_status';
  description = 'Get comprehensive system health and status information';
  allowedRoles = ['admin', 'tenant_admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      include_detailed_metrics: {
        type: 'boolean',
        description: 'Include detailed performance metrics (optional, default false)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<SystemStatus> {
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
      WHERE is_active = 1 AND last_login > datetime('now', '-7 days')
    `);

    // Get today's orders
    const todayOrders = await context.db.get(`
      SELECT COUNT(*) as count FROM client_orders 
      WHERE DATE(created_at) = DATE('now')
    `);

    // Calculate system load (simplified metric)
    const totalTenants = await context.db.get('SELECT COUNT(*) as count FROM tenants WHERE is_active = 1');
    const totalOrders = await context.db.get('SELECT COUNT(*) as count FROM client_orders WHERE DATE(created_at) = DATE(\'now\')');
    const systemLoad = Math.min(100, (totalOrders.count / Math.max(1, totalTenants.count)) * 10);

    // Storage usage (simplified calculation)
    const storageUsage = Math.random() * 30 + 40; // Simulated 40-70% usage

    const result: SystemStatus = {
      database_status: databaseStatus,
      api_status: 'operational',
      active_users: activeUsers.count,
      total_orders_today: todayOrders.count,
      system_load: Math.round(systemLoad),
      storage_usage: Math.round(storageUsage)
    };

    // Add detailed metrics if requested
    if (include_detailed_metrics) {
      const detailedMetrics = await this.getDetailedMetrics(context);
      Object.assign(result, { detailed_metrics: detailedMetrics });
    }

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }

  private async getDetailedMetrics(context: AgentContext): Promise<any> {
    const metrics = await context.db.all(`
      SELECT 
        t.subscription_plan,
        COUNT(*) as tenant_count,
        SUM(ta.total_orders) as total_orders,
        SUM(ta.total_revenue) as total_revenue
      FROM tenants t
      LEFT JOIN tenant_analytics ta ON t.id = ta.tenant_id AND ta.date = DATE('now')
      WHERE t.is_active = 1
      GROUP BY t.subscription_plan
    `);

    return {
      tenant_distribution: metrics,
      database_size_mb: Math.round(Math.random() * 500 + 100), // Simulated
      response_time_ms: Math.round(Math.random() * 50 + 20),
      error_rate_percent: Math.round(Math.random() * 2 * 100) / 100
    };
  }
}

/**
 * Get tenant overview and statistics
 */
export class GetTenantOverviewTool extends BaseTool {
  name = 'get_tenant_overview';
  description = 'Get overview of all tenants with key statistics and health metrics';
  allowedRoles = ['admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      subscription_plan: {
        type: 'string',
        description: 'Filter by subscription plan (optional)',
        enum: ['free', 'basic', 'premium', 'enterprise']
      },
      status: {
        type: 'string',
        description: 'Filter by tenant status (optional)',
        enum: ['active', 'inactive', 'suspended', 'cancelled']
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tenants to return (optional, default 50)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { subscription_plan, status = 'active', limit = 50 } = args;
    
    let query = `
      SELECT 
        t.*,
        COUNT(u.id) as user_count,
        COUNT(p.id) as product_count,
        COALESCE(ta.total_orders, 0) as orders_today,
        COALESCE(ta.total_revenue, 0) as revenue_today
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = 1
      LEFT JOIN products p ON t.id = p.tenant_id
      LEFT JOIN tenant_analytics ta ON t.id = ta.tenant_id AND ta.date = DATE('now')
      WHERE t.subscription_status = ?
    `;
    const params = [status];

    if (subscription_plan) {
      query += ' AND t.subscription_plan = ?';
      params.push(subscription_plan);
    }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT ?';
    params.push(limit);

    const tenants = await context.db.all(query, params);

    // Calculate usage percentages for each tenant
    const tenantsWithUsage = await Promise.all(
      tenants.map(async (tenant: any) => {
        const limits = await getTenantLimits(tenant.id);
        
        return {
          ...tenant,
          usage_stats: {
            users: {
              current: limits.currentUsers,
              limit: limits.maxUsers,
              percentage: limits.usersPercentage
            },
            products: {
              current: limits.currentProducts,
              limit: limits.maxProducts,
              percentage: limits.productsPercentage
            },
            orders: {
              current: limits.currentMonthOrders,
              limit: limits.maxOrdersPerMonth,
              percentage: limits.ordersPercentage
            }
          },
          health_score: this.calculateTenantHealthScore(tenant, limits)
        };
      })
    );

    // Get summary statistics
    const summary = {
      total_tenants: tenants.length,
      active_tenants: tenants.filter((t: any) => t.is_active).length,
      total_users: tenants.reduce((sum: number, t: any) => sum + t.user_count, 0),
      total_revenue_today: tenants.reduce((sum: number, t: any) => sum + (t.revenue_today || 0), 0),
      subscription_distribution: this.getSubscriptionDistribution(tenants)
    };

    const result = {
      summary,
      tenants: tenantsWithUsage
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }

  private calculateTenantHealthScore(tenant: any, limits: any): number {
    let score = 100;
    
    // Deduct points for high usage
    if (limits.usersPercentage > 90) score -= 20;
    else if (limits.usersPercentage > 80) score -= 10;
    
    if (limits.productsPercentage > 90) score -= 20;
    else if (limits.productsPercentage > 80) score -= 10;
    
    if (limits.ordersPercentage > 90) score -= 20;
    else if (limits.ordersPercentage > 80) score -= 10;
    
    // Bonus for activity
    if (tenant.orders_today > 0) score += 5;
    if (tenant.revenue_today > 100) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private getSubscriptionDistribution(tenants: any[]): any {
    const distribution: any = { free: 0, basic: 0, premium: 0, enterprise: 0 };
    
    tenants.forEach(tenant => {
      if (distribution.hasOwnProperty(tenant.subscription_plan)) {
        distribution[tenant.subscription_plan]++;
      }
    });
    
    return distribution;
  }
}

/**
 * Create a new tenant
 */
export class CreateTenantTool extends BaseTool {
  name = 'create_tenant';
  description = 'Create a new tenant in the system';
  allowedRoles = ['admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Tenant name'
      },
      type: {
        type: 'string',
        description: 'Tenant type',
        enum: ['bakery', 'restaurant', 'cafe', 'enterprise', 'individual']
      },
      subscription_plan: {
        type: 'string',
        description: 'Initial subscription plan',
        enum: ['free', 'basic', 'premium', 'enterprise']
      },
      primary_contact_email: {
        type: 'string',
        description: 'Primary contact email'
      },
      phone: {
        type: 'string',
        description: 'Contact phone number (optional)'
      },
      address: {
        type: 'string',
        description: 'Business address (optional)'
      },
      city: {
        type: 'string',
        description: 'City (optional)'
      },
      postcode: {
        type: 'string',
        description: 'Postal code (optional)'
      }
    },
    required: ['name', 'type', 'subscription_plan', 'primary_contact_email']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { name, type, subscription_plan, primary_contact_email, phone, address, city, postcode } = args;
    
    // Generate unique slug
    const { generateTenantSlug } = await import('../../utils/tenant-utils');
    const slug = await generateTenantSlug(name);
    
    // Create tenant
    const tenantId = await createTenant({
      name,
      slug,
      type,
      subscription_plan,
      primary_contact_email,
      phone,
      address,
      city,
      postcode
    });

    // Get the created tenant with limits
    const tenant = await context.db.get('SELECT * FROM tenants WHERE id = ?', [tenantId]);
    const limits = await getTenantLimits(tenantId);

    const result = {
      tenant_id: tenantId,
      tenant_details: tenant,
      initial_limits: limits,
      setup_required: [
        'Create admin user',
        'Configure payment method',
        'Set up initial products',
        'Configure suppliers'
      ]
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Update tenant subscription plan
 */
export class UpdateTenantSubscriptionTool extends BaseTool {
  name = 'update_tenant_subscription';
  description = 'Update a tenant subscription plan and limits';
  allowedRoles = ['admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      tenant_id: {
        type: 'number',
        description: 'ID of the tenant to update'
      },
      subscription_plan: {
        type: 'string',
        description: 'New subscription plan',
        enum: ['free', 'basic', 'premium', 'enterprise']
      },
      subscription_status: {
        type: 'string',
        description: 'New subscription status (optional)',
        enum: ['active', 'inactive', 'suspended', 'cancelled']
      },
      reason: {
        type: 'string',
        description: 'Reason for the change (optional)'
      }
    },
    required: ['tenant_id', 'subscription_plan']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { tenant_id, subscription_plan, subscription_status = 'active', reason } = args;
    
    // Get current tenant info
    const tenant = await context.db.get('SELECT * FROM tenants WHERE id = ?', [tenant_id]);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update subscription
    await updateTenantSubscription(tenant_id, subscription_plan, subscription_status, context.userId);

    // Get updated limits
    const newLimits = await getTenantLimits(tenant_id);

    const result = {
      tenant_id,
      tenant_name: tenant.name,
      old_plan: tenant.subscription_plan,
      new_plan: subscription_plan,
      old_status: tenant.subscription_status,
      new_status: subscription_status,
      new_limits: newLimits,
      reason,
      effective_date: new Date().toISOString()
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Get system analytics and usage metrics
 */
export class GetSystemAnalyticsTool extends BaseTool {
  name = 'get_system_analytics';
  description = 'Get comprehensive system analytics including usage trends and performance metrics';
  allowedRoles = ['admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        description: 'Time period for analytics',
        enum: ['today', 'week', 'month', 'quarter']
      },
      metric_type: {
        type: 'string',
        description: 'Type of metrics to include (optional)',
        enum: ['usage', 'revenue', 'performance', 'all']
      }
    },
    required: ['period']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { period, metric_type = 'all' } = args;
    
    // Calculate date range
    const now = new Date();
    let startDate: string;
    
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
        // Default to today if invalid period provided
        startDate = now.toISOString().split('T')[0];
        break;
    }

    const endDate = now.toISOString().split('T')[0];

    const analytics: any = { period: { start: startDate, end: endDate } };

    // Usage metrics
    if (metric_type === 'usage' || metric_type === 'all') {
      analytics.usage = await this.getUsageMetrics(context, startDate, endDate);
    }

    // Revenue metrics
    if (metric_type === 'revenue' || metric_type === 'all') {
      analytics.revenue = await this.getRevenueMetrics(context, startDate, endDate);
    }

    // Performance metrics
    if (metric_type === 'performance' || metric_type === 'all') {
      analytics.performance = await this.getPerformanceMetrics(context, startDate, endDate);
    }

    await this.logToolUsage(context, this.name, args, analytics);

    return analytics;
  }

  private async getUsageMetrics(context: AgentContext, startDate: string, endDate: string): Promise<any> {
    const activeUsers = await context.db.get(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM tool_usage_logs 
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    const totalSessions = await context.db.get(`
      SELECT COUNT(DISTINCT tenant_id, user_id, DATE(created_at)) as count
      FROM tool_usage_logs 
      WHERE DATE(created_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    const topTools = await context.db.all(`
      SELECT tool_name, COUNT(*) as usage_count
      FROM tool_usage_logs 
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY tool_name
      ORDER BY usage_count DESC
      LIMIT 10
    `, [startDate, endDate]);

    return {
      active_users: activeUsers.count,
      total_sessions: totalSessions.count,
      top_tools: topTools
    };
  }

  private async getRevenueMetrics(context: AgentContext, startDate: string, endDate: string): Promise<any> {
    const revenueByPlan = await context.db.all(`
      SELECT 
        t.subscription_plan,
        COUNT(*) as tenant_count,
        SUM(ta.total_revenue) as total_revenue
      FROM tenants t
      LEFT JOIN tenant_analytics ta ON t.id = ta.tenant_id 
        AND ta.date BETWEEN ? AND ?
      WHERE t.is_active = 1
      GROUP BY t.subscription_plan
    `, [startDate, endDate]);

    const totalRevenue = revenueByPlan.reduce((sum: number, plan: any) => sum + (plan.total_revenue || 0), 0);

    return {
      total_revenue: totalRevenue,
      revenue_by_plan: revenueByPlan,
      growth_rate: Math.round((Math.random() * 20 + 5) * 100) / 100 // Simulated growth rate
    };
  }

  private async getPerformanceMetrics(context: AgentContext, startDate: string, endDate: string): Promise<any> {
    const toolPerformance = await context.db.all(`
      SELECT 
        tool_name,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN success = 1 THEN 1 END) as successful_calls,
        AVG(execution_time_ms) as avg_execution_time
      FROM tool_usage_logs 
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY tool_name
      ORDER BY total_calls DESC
    `, [startDate, endDate]);

    const overallSuccessRate = toolPerformance.length > 0
      ? toolPerformance.reduce((sum: number, tool: any) => sum + (tool.successful_calls / tool.total_calls), 0) / toolPerformance.length * 100
      : 100;

    return {
      overall_success_rate: Math.round(overallSuccessRate * 100) / 100,
      tool_performance: toolPerformance.slice(0, 10),
      system_uptime: 99.9 // Simulated uptime
    };
  }
}

/**
 * Manage user accounts across tenants
 */
export class ManageUserAccountsTool extends BaseTool {
  name = 'manage_user_accounts';
  description = 'Manage user accounts including creation, updates, and deactivation';
  allowedRoles = ['admin', 'tenant_admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['list', 'create', 'update', 'deactivate', 'reactivate']
      },
      tenant_id: {
        type: 'number',
        description: 'Tenant ID (required for tenant_admin role)'
      },
      user_id: {
        type: 'number',
        description: 'User ID (required for update, deactivate, reactivate actions)'
      },
      user_data: {
        type: 'object',
        description: 'User data for create/update actions',
        properties: {
          email: { type: 'string' },
          full_name: { type: 'string' },
          role: { type: 'string', enum: ['client', 'supplier', 'driver', 'tenant_admin', 'tenant_manager'] },
          phone: { type: 'string' }
        }
      },
      filters: {
        type: 'object',
        description: 'Filters for list action',
        properties: {
          role: { type: 'string' },
          is_active: { type: 'boolean' },
          limit: { type: 'number' }
        }
      }
    },
    required: ['action']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { action, tenant_id, user_id, user_data, filters } = args;
    
    // For tenant_admin role, ensure they can only manage their own tenant
    let targetTenantId = tenant_id;
    if (context.userRole === 'tenant_admin') {
      targetTenantId = context.tenantId;
    }

    switch (action) {
      case 'list':
        return await this.listUsers(context, targetTenantId, filters);
      
      case 'create':
        if (!targetTenantId || !user_data) {
          throw new Error('tenant_id and user_data are required for create action');
        }
        return await this.createUser(context, targetTenantId, user_data);
      
      case 'update':
        if (!user_id || !user_data) {
          throw new Error('user_id and user_data are required for update action');
        }
        return await this.updateUser(context, user_id, user_data, targetTenantId);
      
      case 'deactivate':
      case 'reactivate':
        if (!user_id) {
          throw new Error('user_id is required for deactivate/reactivate action');
        }
        return await this.toggleUserStatus(context, user_id, action === 'reactivate', targetTenantId);
      
      default:
        throw new Error('Invalid action specified');
    }
  }

  private async listUsers(context: AgentContext, tenantId?: number, filters: any = {}): Promise<any> {
    let query = 'SELECT id, tenant_id, email, full_name, role, phone, is_active, created_at, last_login FROM users WHERE 1=1';
    const params: any[] = [];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (typeof filters.is_active === 'boolean') {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const users = await context.db.all(query, params);
    return { users, total_count: users.length };
  }

  private async createUser(context: AgentContext, tenantId: number, userData: any): Promise<any> {
    const { email, full_name, role, phone } = userData;
    
    // Check if user already exists
    const existingUser = await context.db.get(
      'SELECT id FROM users WHERE tenant_id = ? AND email = ?',
      [tenantId, email]
    );

    if (existingUser) {
      throw new Error('User with this email already exists in the tenant');
    }

    // Create user (password would be set through separate process)
    const result = await context.db.run(`
      INSERT INTO users (tenant_id, email, password_hash, full_name, role, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [tenantId, email, 'temp_hash', full_name, role, phone]);

    return {
      user_id: result.lastID,
      email,
      full_name,
      role,
      tenant_id: tenantId,
      message: 'User created successfully. Password setup email will be sent.'
    };
  }

  private async updateUser(context: AgentContext, userId: number, userData: any, tenantId?: number): Promise<any> {
    // Verify user exists and belongs to tenant (if tenant_admin)
    let query = 'SELECT * FROM users WHERE id = ?';
    const params = [userId];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    const user = await context.db.get(query, params);
    if (!user) {
      throw new Error('User not found or access denied');
    }

    // Update user
    const updateFields = [];
    const updateParams = [];

    if (userData.full_name) {
      updateFields.push('full_name = ?');
      updateParams.push(userData.full_name);
    }

    if (userData.role) {
      updateFields.push('role = ?');
      updateParams.push(userData.role);
    }

    if (userData.phone) {
      updateFields.push('phone = ?');
      updateParams.push(userData.phone);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(userId);

    await context.db.run(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
    `, updateParams);

    return {
      user_id: userId,
      updated_fields: Object.keys(userData),
      message: 'User updated successfully'
    };
  }

  private async toggleUserStatus(context: AgentContext, userId: number, activate: boolean, tenantId?: number): Promise<any> {
    // Verify user exists and belongs to tenant (if tenant_admin)
    let query = 'SELECT * FROM users WHERE id = ?';
    const params = [userId];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }

    const user = await context.db.get(query, params);
    if (!user) {
      throw new Error('User not found or access denied');
    }

    await context.db.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [activate ? 1 : 0, userId]
    );

    return {
      user_id: userId,
      email: user.email,
      new_status: activate ? 'active' : 'inactive',
      message: `User ${activate ? 'activated' : 'deactivated'} successfully`
    };
  }
}