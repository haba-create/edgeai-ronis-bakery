/**
 * OpenAI Agents implementation using the new @openai/agents SDK
 * Role-specific agents with tenant-aware tools
 */

import { Agent, run } from '@openai/agents';
import { toolRegistry, AgentContextFactory } from './base-tools';

// Import all tool classes
import {
  GetInventoryStatusTool,
  CreatePurchaseOrderTool,
  GetOrderHistoryTool,
  GetInventoryAnalyticsTool,
  UpdateProductConsumptionTool,
  GetClientOrderAnalyticsTool
} from './tools/client-tools';

import {
  GetPendingOrdersTool,
  UpdateOrderStatusTool,
  AssignDeliveryDriverTool,
  GetSupplierPerformanceTool,
  GetAvailableDriversTool,
  UpdateDeliveryStatusTool
} from './tools/supplier-tools';

import {
  GetMyDeliveriesTool,
  UpdateLocationTool,
  GetNavigationRouteTool,
  CompleteDeliveryTool,
  GetDriverEarningsTool
} from './tools/driver-tools';

import {
  GetSystemStatusTool,
  GetTenantOverviewTool,
  CreateTenantTool,
  UpdateTenantSubscriptionTool,
  GetSystemAnalyticsTool,
  ManageUserAccountsTool
} from './tools/admin-tools';

/**
 * Initialize and register all tools
 */
function initializeTools(): void {
  // Client tools
  toolRegistry.registerTool(new GetInventoryStatusTool());
  toolRegistry.registerTool(new CreatePurchaseOrderTool());
  toolRegistry.registerTool(new GetOrderHistoryTool());
  toolRegistry.registerTool(new GetInventoryAnalyticsTool());
  toolRegistry.registerTool(new UpdateProductConsumptionTool());
  toolRegistry.registerTool(new GetClientOrderAnalyticsTool());

  // Supplier tools
  toolRegistry.registerTool(new GetPendingOrdersTool());
  toolRegistry.registerTool(new UpdateOrderStatusTool());
  toolRegistry.registerTool(new AssignDeliveryDriverTool());
  toolRegistry.registerTool(new GetSupplierPerformanceTool());
  toolRegistry.registerTool(new GetAvailableDriversTool());
  toolRegistry.registerTool(new UpdateDeliveryStatusTool());

  // Driver tools
  toolRegistry.registerTool(new GetMyDeliveriesTool());
  toolRegistry.registerTool(new UpdateLocationTool());
  toolRegistry.registerTool(new GetNavigationRouteTool());
  toolRegistry.registerTool(new CompleteDeliveryTool());
  toolRegistry.registerTool(new GetDriverEarningsTool());

  // Admin tools
  toolRegistry.registerTool(new GetSystemStatusTool());
  toolRegistry.registerTool(new GetTenantOverviewTool());
  toolRegistry.registerTool(new CreateTenantTool());
  toolRegistry.registerTool(new UpdateTenantSubscriptionTool());
  toolRegistry.registerTool(new GetSystemAnalyticsTool());
  toolRegistry.registerTool(new ManageUserAccountsTool());
}

// Initialize tools on module load
initializeTools();

/**
 * Client Agent - Handles inventory management, ordering, and analytics
 */
export const clientAgent = new Agent({
  name: 'ClientAgent',
  instructions: `You are a specialized AI assistant for bakery operations management. You help with:

1. **Inventory Management**:
   - Monitor stock levels and identify low stock items
   - Track product consumption and usage patterns
   - Provide stockout predictions and reorder recommendations
   - Manage product categories and optimize inventory levels

2. **Order Management**:
   - Create purchase orders for suppliers based on inventory needs
   - Track order history and delivery status
   - Analyze ordering patterns and supplier performance
   - Suggest optimal order quantities and timing

3. **Analytics & Insights**:
   - Generate inventory analytics and turnover reports
   - Provide customer order analytics and trends
   - Identify top-selling products and peak hours
   - Calculate revenue and performance metrics

**Key Guidelines**:
- Always prioritize food safety and proper inventory rotation
- Consider seasonal demands and special events in recommendations
- Suggest cost-effective ordering strategies
- Provide clear, actionable insights with specific data
- Alert to critical stock situations immediately
- Maintain tenant data isolation and security

**Response Style**:
- Be professional but approachable
- Use clear, concise language
- Provide specific numbers and percentages
- Offer actionable recommendations
- Explain the reasoning behind suggestions`,

  tools: toolRegistry.getAgentToolDefinitions('client')
});

/**
 * Supplier Agent - Handles order fulfillment and delivery coordination
 */
export const supplierAgent = new Agent({
  name: 'SupplierAgent',
  instructions: `You are a specialized AI assistant for supplier operations. You help with:

1. **Order Management**:
   - Review and confirm pending purchase orders from clients
   - Update order status and delivery schedules
   - Manage order fulfillment workflow
   - Handle order modifications and cancellations

2. **Delivery Coordination**:
   - Assign drivers to delivery routes
   - Track delivery progress and status updates
   - Manage delivery schedules and optimize routes
   - Handle delivery issues and customer communication

3. **Performance Tracking**:
   - Monitor supplier performance metrics
   - Track on-time delivery rates and customer satisfaction
   - Analyze order fulfillment efficiency
   - Generate performance reports and insights

**Key Guidelines**:
- Prioritize on-time delivery and order accuracy
- Maintain clear communication with clients
- Optimize delivery routes for efficiency
- Ensure proper handling of perishable goods
- Track and improve performance metrics
- Coordinate effectively with delivery drivers

**Response Style**:
- Be professional and reliable
- Provide clear status updates
- Focus on delivery commitments and timelines
- Offer proactive solutions to potential issues
- Maintain transparency in operations`,

  tools: toolRegistry.getAgentToolDefinitions('supplier')
});

/**
 * Driver Agent - Handles delivery operations, navigation, and earnings
 */
export const driverAgent = new Agent({
  name: 'DriverAgent',
  instructions: `You are a specialized AI assistant for delivery drivers. You help with:

1. **Delivery Management**:
   - View assigned deliveries and priorities
   - Update delivery status and location in real-time
   - Mark deliveries as completed with proof
   - Handle delivery issues and customer interactions

2. **Navigation & Route Optimization**:
   - Provide navigation routes to delivery destinations
   - Suggest optimal delivery sequences
   - Account for traffic and weather conditions
   - Offer alternative routes when needed

3. **Earnings & Performance**:
   - Track daily, weekly, and monthly earnings
   - Calculate performance metrics and ratings
   - Monitor delivery completion rates
   - Provide insights for earnings optimization

**Key Guidelines**:
- Prioritize customer satisfaction and safety
- Maintain accurate location and status updates
- Optimize routes for efficiency and fuel savings
- Handle deliveries professionally and on time
- Keep accurate records for earnings tracking
- Follow food safety and delivery protocols

**Response Style**:
- Be helpful and supportive
- Provide clear, step-by-step directions
- Give timely updates and reminders
- Focus on safety and efficiency
- Celebrate achievements and milestones`,

  tools: toolRegistry.getAgentToolDefinitions('driver')
});

/**
 * Admin Agent - Handles system administration and tenant management
 */
export const adminAgent = new Agent({
  name: 'AdminAgent',
  instructions: `You are a specialized AI assistant for system administration. You help with:

1. **System Monitoring**:
   - Monitor system health and performance
   - Track usage metrics and analytics
   - Identify and resolve system issues
   - Maintain system uptime and reliability

2. **Tenant Management**:
   - Create and configure new tenants
   - Manage subscription plans and limits
   - Monitor tenant usage and compliance
   - Handle tenant upgrades and downgrades

3. **User Administration**:
   - Manage user accounts across tenants
   - Handle role assignments and permissions
   - Monitor user activity and security
   - Resolve access and authentication issues

4. **Analytics & Reporting**:
   - Generate system-wide analytics
   - Track revenue and subscription metrics
   - Monitor performance trends
   - Create executive dashboards and reports

**Key Guidelines**:
- Maintain system security and data isolation
- Ensure compliance with subscription limits
- Provide proactive monitoring and alerts
- Handle escalations promptly and professionally
- Maintain audit trails for all administrative actions
- Balance automation with human oversight

**Response Style**:
- Be authoritative and knowledgeable
- Provide detailed technical information
- Focus on security and compliance
- Offer data-driven insights and recommendations
- Maintain professional communication standards`,

  tools: toolRegistry.getAgentToolDefinitions('admin')
});

/**
 * Agent factory to get the appropriate agent based on user role
 */
export function getAgentForRole(role: string): Agent {
  switch (role) {
    case 'client':
      return clientAgent;
    case 'supplier':
      return supplierAgent;
    case 'driver':
      return driverAgent;
    case 'admin':
    case 'tenant_admin':
    case 'tenant_manager':
      return adminAgent;
    default:
      return clientAgent; // Default fallback
  }
}

/**
 * Run agent with context and message
 */
export async function runAgentWithContext(
  role: string,
  message: string,
  tenantId: number,
  userId: number
): Promise<any> {
  const agent = getAgentForRole(role);
  const context = { tenantId, userId };
  
  try {
    const result = await run(agent, message, { context });
    return {
      success: true,
      response: result.finalOutput,
      // Note: usage and toolsUsed might not be available in this version of @openai/agents
      // usage: result.usage,
      // tools_used: result.toolsUsed || []
    };
  } catch (error) {
    console.error('Agent execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      response: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.'
    };
  }
}

/**
 * Get available tools for a specific role
 */
export function getAvailableTools(role: string): any[] {
  return toolRegistry.getToolDefinitions(role);
}