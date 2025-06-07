/**
 * Base tools framework for OpenAI Agents with tenant-aware database access
 * Provides security, validation, and tenant isolation for all agent tools
 */

import { Database } from 'sqlite';
import { getDb } from '../utils/db';
import { getTenantById, getTenantLimits } from '../utils/tenant-utils';
import { 
  AgentContext, 
  AgentTool, 
  AgentResponse, 
  TenantInfo, 
  UserInfo,
  LimitOperation 
} from './types';

/**
 * Security manager for validating agent access and permissions
 */
export class AgentSecurityManager {
  /**
   * Validate user has access to specific tenant
   */
  static async validateTenantAccess(userId: number, tenantId: number, db: Database): Promise<boolean> {
    const user = await db.get(
      'SELECT id, tenant_id, is_active FROM users WHERE id = ? AND tenant_id = ? AND is_active = 1',
      [userId, tenantId]
    );
    return !!user;
  }

  /**
   * Validate user has specific role permissions
   */
  static async validateRolePermissions(
    userId: number, 
    requiredRoles: string[], 
    db: Database
  ): Promise<boolean> {
    const user = await db.get(
      'SELECT role FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );
    
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }

  /**
   * Validate tenant subscription limits
   */
  static async validateTenantLimits(
    tenantId: number, 
    operation: LimitOperation
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const limits = await getTenantLimits(tenantId);
      
      switch (operation) {
        case 'add_user':
          return {
            allowed: limits.currentUsers < limits.maxUsers,
            reason: limits.currentUsers >= limits.maxUsers ? 'User limit exceeded' : undefined
          };
        case 'add_product':
          return {
            allowed: limits.currentProducts < limits.maxProducts,
            reason: limits.currentProducts >= limits.maxProducts ? 'Product limit exceeded' : undefined
          };
        case 'place_order':
          return {
            allowed: limits.currentMonthOrders < limits.maxOrdersPerMonth,
            reason: limits.currentMonthOrders >= limits.maxOrdersPerMonth ? 'Monthly order limit exceeded' : undefined
          };
        default:
          return { allowed: true };
      }
    } catch (error) {
      return { allowed: false, reason: 'Unable to validate limits' };
    }
  }

  /**
   * Sanitize and validate input parameters
   */
  static sanitizeParams(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return {};
    }

    const sanitized: any = {};
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        return;
      }
      
      // Sanitize strings
      if (typeof value === 'string') {
        sanitized[key] = value.trim().substring(0, 1000); // Limit length
      }
      // Validate numbers
      else if (typeof value === 'number') {
        sanitized[key] = isNaN(value) ? 0 : value;
      }
      // Pass through booleans and safe objects
      else if (typeof value === 'boolean' || Array.isArray(value)) {
        sanitized[key] = value;
      }
      // Recursively sanitize objects
      else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeParams(value);
      }
    });
    
    return sanitized;
  }
}

/**
 * Base class for all agent tools with built-in security and tenant isolation
 */
export abstract class BaseTool implements AgentTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  /**
   * Required roles to use this tool
   */
  protected abstract allowedRoles: string[];

  /**
   * Whether this tool requires tenant limits validation
   */
  protected requiresLimitValidation: boolean = false;

  /**
   * What operation this tool performs for limit validation
   */
  protected limitOperation?: LimitOperation;

  /**
   * Execute the tool with full security validation
   */
  async function(args: any, context: AgentContext): Promise<AgentResponse> {
    try {
      // Sanitize input parameters
      const sanitizedArgs = AgentSecurityManager.sanitizeParams(args);

      // Validate tenant access
      const hasAccess = await AgentSecurityManager.validateTenantAccess(
        context.userId, 
        context.tenantId, 
        context.db
      );
      
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied: Invalid tenant access'
        };
      }

      // Validate role permissions
      const hasPermission = await AgentSecurityManager.validateRolePermissions(
        context.userId,
        this.allowedRoles,
        context.db
      );

      if (!hasPermission) {
        return {
          success: false,
          error: `Access denied: Required roles: ${this.allowedRoles.join(', ')}`
        };
      }

      // Validate tenant limits if required
      if (this.requiresLimitValidation && this.limitOperation) {
        const limitCheck = await AgentSecurityManager.validateTenantLimits(
          context.tenantId,
          this.limitOperation
        );

        if (!limitCheck.allowed) {
          return {
            success: false,
            error: `Operation blocked: ${limitCheck.reason}`
          };
        }
      }

      // Execute the tool implementation
      const result = await this.execute(sanitizedArgs, context);
      
      return {
        success: true,
        data: result,
        message: 'Operation completed successfully'
      };

    } catch (error) {
      console.error(`Error in tool ${this.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Abstract method to be implemented by specific tools
   */
  protected abstract execute(args: any, context: AgentContext): Promise<any>;

  /**
   * Helper method to get tenant information
   */
  protected async getTenantInfo(context: AgentContext): Promise<TenantInfo | null> {
    return await getTenantById(context.tenantId);
  }

  /**
   * Helper method to get user information
   */
  protected async getUserInfo(context: AgentContext): Promise<UserInfo | null> {
    const user = await context.db.get(
      'SELECT * FROM users WHERE id = ? AND tenant_id = ?',
      [context.userId, context.tenantId]
    );
    return user || null;
  }

  /**
   * Helper method to log tool usage for audit trail
   */
  protected async logToolUsage(
    context: AgentContext,
    toolName: string,
    parameters: any,
    result: any
  ): Promise<void> {
    try {
      await context.db.run(`
        INSERT INTO tool_usage_logs (
          tenant_id, user_id, tool_name, parameters, result, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        context.tenantId,
        context.userId,
        toolName,
        JSON.stringify(parameters),
        JSON.stringify(result)
      ]);
    } catch (error) {
      // Log error but don't fail the tool execution
      console.warn('Failed to log tool usage:', error);
    }
  }
}

/**
 * Agent context factory for creating secure agent contexts
 */
export class AgentContextFactory {
  /**
   * Create an agent context with database connection and user validation
   */
  static async createContext(
    tenantId: number,
    userId: number
  ): Promise<AgentContext | null> {
    try {
      const db = await getDb();
      
      // Validate user exists and belongs to tenant
      const user = await db.get(
        'SELECT id, tenant_id, role FROM users WHERE id = ? AND tenant_id = ? AND is_active = 1',
        [userId, tenantId]
      );

      if (!user) {
        return null;
      }

      // Validate tenant is active
      const tenant = await getTenantById(tenantId);
      if (!tenant || !tenant.is_active) {
        return null;
      }

      return {
        tenantId,
        userId,
        userRole: user.role,
        db
      };
    } catch (error) {
      console.error('Failed to create agent context:', error);
      return null;
    }
  }
}

/**
 * Tool registry for managing and executing agent tools
 */
export class AgentToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  /**
   * Register a tool with the registry
   */
  registerTool(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools available for a specific role
   */
  getToolsForRole(role: string): BaseTool[] {
    const availableTools: BaseTool[] = [];
    
    this.tools.forEach(tool => {
      if (tool['allowedRoles'].includes(role)) {
        availableTools.push(tool);
      }
    });
    
    return availableTools;
  }

  /**
   * Execute a tool with the given context and parameters
   */
  async executeTool(
    toolName: string,
    args: any,
    context: AgentContext
  ): Promise<AgentResponse> {
    const tool = this.getTool(toolName);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`
      };
    }

    return await tool.function(args, context);
  }

  /**
   * Get tool definitions for OpenAI Agents SDK
   */
  getToolDefinitions(role?: string): any[] {
    const tools = role ? this.getToolsForRole(role) : Array.from(this.tools.values());
    
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  /**
   * Get agent-compatible tool definitions for OpenAI Agents SDK
   */
  getAgentToolDefinitions(role?: string): any[] {
    const tools = role ? this.getToolsForRole(role) : Array.from(this.tools.values());
    
    return tools.map(tool => ({
      type: "function" as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: false,
      needsApproval: false,
      invoke: async (args: any, context: any) => {
        const agentContext = await AgentContextFactory.createContext(
          context.tenantId, 
          context.userId
        );
        
        if (!agentContext) {
          throw new Error('Unable to create agent context');
        }
        
        return await this.executeTool(tool.name, args, agentContext);
      }
    }));
  }
}

// Create global tool registry instance
export const toolRegistry = new AgentToolRegistry();

/**
 * Add audit log table creation SQL (to be added to database schema)
 */
export const AUDIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS tool_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    parameters TEXT,
    result TEXT,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_tool_usage_tenant_user ON tool_usage_logs(tenant_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON tool_usage_logs(tool_name);
  CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage_logs(created_at);
`;