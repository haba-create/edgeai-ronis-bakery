/**
 * Agent SDK Compatible Tools
 * Converts existing database tools to OpenAI Agents SDK format
 */

import { getDb } from '@/utils/db';
import { logger } from '@/utils/logger';

// Import existing tool executors
import { executeCustomerTool } from './tools/customer-tools';
import { executeOwnerTool } from './tools/owner-tools';

interface AgentContext {
  userId: string;
  userRole: string;
  tenantId?: number;
  db: any;
}

/**
 * Simple tool wrapper for Agent SDK compatibility
 */
abstract class BaseAgentTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: any;
  protected allowedRoles: string[] = [];
  
  async execute(args: any, context: AgentContext): Promise<any> {
    // Validate role access
    if (this.allowedRoles.length > 0 && !this.allowedRoles.includes(context.userRole)) {
      throw new Error(`Access denied. This tool is only available to: ${this.allowedRoles.join(', ')}`);
    }

    try {
      const result = await this.executeImpl(args, context);
      return result;
    } catch (error) {
      logger.error(`Tool execution failed: ${this.name}`, { 
        userId: context.userId, 
        userRole: context.userRole 
      }, error as Error);
      throw error;
    }
  }

  protected abstract executeImpl(args: any, context: AgentContext): Promise<any>;
}

/**
 * Customer/Client Tools
 */
export class SearchProductsTool extends BaseAgentTool {
  name = 'search_products';
  description = 'Search for products by name, category, or description';
  allowedRoles = ['customer', 'client', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (product name, category, or keywords)'
      },
      category: {
        type: 'string',
        description: 'Filter by category (optional)'
      },
      kosher_only: {
        type: 'boolean',
        description: 'Show only kosher certified products'
      }
    },
    required: ['query']
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    return await executeCustomerTool('search_products', args, context);
  }
}

export class GetProductRecommendationsTool extends BaseAgentTool {
  name = 'get_product_recommendations';
  description = 'Get personalized product recommendations based on preferences';
  allowedRoles = ['customer', 'client', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      preferences: {
        type: 'array',
        items: { type: 'string' },
        description: 'Customer preferences (e.g., kosher, fresh, bakery, dairy)'
      },
      budget_range: {
        type: 'string',
        description: 'Budget range (low, medium, high)'
      }
    },
    required: ['preferences']
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    return await executeCustomerTool('get_product_recommendations', args, context);
  }
}

export class CheckProductAvailabilityTool extends BaseAgentTool {
  name = 'check_product_availability';
  description = 'Check if specific products are in stock';
  allowedRoles = ['customer', 'client', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      product_ids: {
        type: 'array',
        items: { type: 'number' },
        description: 'List of product IDs to check'
      }
    },
    required: ['product_ids']
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    return await executeCustomerTool('check_product_availability', args, context);
  }
}

/**
 * Owner/Admin Business Tools
 */
export class GetBusinessAnalyticsTool extends BaseAgentTool {
  name = 'get_business_analytics';
  description = 'Get comprehensive business analytics and performance metrics';
  allowedRoles = ['owner', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        description: 'Time period for analytics',
        enum: ['today', 'week', 'month', 'quarter']
      },
      metrics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific metrics to include (optional)'
      }
    },
    required: ['period']
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    return await executeOwnerTool('get_business_analytics', args, context);
  }
}

export class GetInventoryOptimizationTool extends BaseAgentTool {
  name = 'get_inventory_optimization';
  description = 'Get inventory optimization recommendations and alerts';
  allowedRoles = ['owner', 'client', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      include_forecasting: {
        type: 'boolean',
        description: 'Include demand forecasting (optional)'
      },
      category_filter: {
        type: 'string',
        description: 'Filter by product category (optional)'
      }
    }
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    return await executeOwnerTool('get_inventory_optimization', args, context);
  }
}

/**
 * Supplier Tools
 */
export class GetSupplierOrdersTool extends BaseAgentTool {
  name = 'get_supplier_orders';
  description = 'Get orders for the current supplier';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by order status (optional)',
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
      },
      date_range: {
        type: 'object',
        description: 'Date range filter (optional)',
        properties: {
          start_date: { type: 'string' },
          end_date: { type: 'string' }
        }
      }
    }
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    // For now, return a simple mock response since supplier tools are class-based
    return {
      orders: [],
      message: "No orders found. This tool needs to be connected to the supplier database."
    };
  }
}

export class UpdateSupplierOrderStatusTool extends BaseAgentTool {
  name = 'update_order_status';
  description = 'Update the status of a supplier order';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      order_id: {
        type: 'number',
        description: 'ID of the order to update'
      },
      status: {
        type: 'string',
        description: 'New status for the order',
        enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
      },
      notes: {
        type: 'string',
        description: 'Optional notes about the status update'
      }
    },
    required: ['order_id', 'status']
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    // For now, return a simple mock response
    return {
      order_id: args.order_id,
      new_status: args.status,
      message: `Order ${args.order_id} status updated to ${args.status} (mock response)`
    };
  }
}

/**
 * Client Business Management Tools
 */
export class GetClientInventoryTool extends BaseAgentTool {
  name = 'get_inventory';
  description = 'Get current inventory for the client business';
  allowedRoles = ['client', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by product category (optional)'
      },
      low_stock_only: {
        type: 'boolean',
        description: 'Show only low stock items (optional)'
      }
    }
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    // For now, return a simple mock response
    return {
      inventory: [],
      message: "Inventory data unavailable. This tool needs to be connected to the client database."
    };
  }
}

export class PlaceClientOrderTool extends BaseAgentTool {
  name = 'place_order';
  description = 'Place a new order with a supplier';
  allowedRoles = ['client', 'admin'];
  
  parameters = {
    type: 'object',
    properties: {
      supplier_id: {
        type: 'number',
        description: 'ID of the supplier'
      },
      items: {
        type: 'array',
        description: 'List of items to order',
        items: {
          type: 'object',
          properties: {
            product_id: { type: 'number' },
            quantity: { type: 'number' },
            unit_price: { type: 'number' }
          },
          required: ['product_id', 'quantity', 'unit_price']
        }
      },
      notes: {
        type: 'string',
        description: 'Special instructions or notes'
      }
    },
    required: ['supplier_id', 'items']
  };

  protected async executeImpl(args: any, context: AgentContext): Promise<any> {
    // For now, return a simple mock response
    return {
      order_id: Math.floor(Math.random() * 1000),
      supplier_id: args.supplier_id,
      items: args.items,
      total_items: args.items.length,
      message: "Order placed successfully (mock response)"
    };
  }
}

/**
 * Get all available tools for a specific role
 */
export function getAgentSDKTools(role: string): BaseAgentTool[] {
  const tools: BaseAgentTool[] = [];

  // Customer/Client tools
  if (role === 'customer' || role === 'client') {
    tools.push(
      new SearchProductsTool(),
      new GetProductRecommendationsTool(),
      new CheckProductAvailabilityTool()
    );
  }

  // Client-specific business tools
  if (role === 'client') {
    tools.push(
      new GetClientInventoryTool(),
      new PlaceClientOrderTool()
    );
  }

  // Owner/Admin business tools
  if (role === 'owner' || role === 'admin') {
    tools.push(
      new GetBusinessAnalyticsTool(),
      new GetInventoryOptimizationTool()
    );
  }

  // Supplier tools
  if (role === 'supplier') {
    tools.push(
      new GetSupplierOrdersTool(),
      new UpdateSupplierOrderStatusTool()
    );
  }

  // Admin gets access to additional tools from other modules
  if (role === 'admin') {
    // Admin can use tools from any role for testing/support
    tools.push(
      new SearchProductsTool(),
      new GetClientInventoryTool(),
      new GetSupplierOrdersTool()
    );
  }

  return tools;
}

/**
 * Get tool names for a role (for debugging)
 */
export function getToolNames(role: string): string[] {
  return getAgentSDKTools(role).map(tool => tool.name);
}