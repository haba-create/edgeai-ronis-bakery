/**
 * Unified OpenAI Agents SDK Implementation
 * Single agent system with role-based database tools for edgeai-ronis-bakery
 * Uses OpenAI Agents SDK with gpt-4o-mini model
 */

import { Agent } from '@openai/agents';
import { getDb } from '@/utils/db';
import { logger } from '@/utils/logger';

// Import all database tools
import { GetMyDeliveriesTool, UpdateLocationTool, GetNavigationRouteTool, CompleteDeliveryTool, GetDriverEarningsTool } from './tools/driver-tools';
import { GetSystemStatusTool, GetTenantOverviewTool, CreateTenantTool, UpdateTenantSubscriptionTool, GetSystemAnalyticsTool, ManageUserAccountsTool } from './tools/admin-tools';
import { getAgentSDKTools } from './agentSDKTools';

// Initialize OpenAI client only if API key is available
const openaiApiKey = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? 
  process.env.OPENAI_API_KEY : null;

interface AgentResponse {
  response: string;
  toolCalls?: Array<{
    name: string;
    result: any;
  }>;
  fallbackMode?: boolean;
  metadata?: {
    role: string;
    userId: string;
    executedTools: number;
    fallbackMode?: boolean;
    agentId?: string;
  };
}

interface AgentContext {
  userId: string;
  userRole: string;
  tenantId?: number;
  db: any;
}

/**
 * Role-based system prompts for different user types
 */
const ROLE_PROMPTS = {
  admin: `You are an AI assistant for system administrators at Roni's Bakery Platform. 
You manage the entire multi-tenant system including tenants, users, subscriptions, and system health.
Your capabilities include:
- System monitoring and health checks
- Tenant management and subscription updates
- User account administration
- System analytics and performance metrics
- Platform-wide operations

Use the available database tools to provide accurate, real-time information and help with administrative tasks.`,

  owner: `You are an AI assistant for business owners at Roni's Bakery. 
You help with business analytics, inventory optimization, supplier management, and operational insights.
Your capabilities include:
- Business performance analytics
- Inventory management and optimization
- Supplier coordination and evaluation
- Revenue and cost analysis
- Operational efficiency recommendations

Use the available tools to analyze performance and make data-driven business decisions.`,

  supplier: `You are an AI assistant for suppliers to Roni's Bakery. 
You help with order management, inventory coordination, and delivery tracking.
Your capabilities include:
- Order status management and updates
- Inventory coordination with clients
- Delivery scheduling and tracking
- Performance metrics and analytics
- Communication with delivery drivers

Use the available tools to efficiently manage your orders and maintain high service quality.`,

  driver: `You are an AI assistant for delivery drivers at Roni's Bakery. 
You help with delivery management, navigation, earnings tracking, and route optimization.
Your capabilities include:
- Delivery schedule and status management
- Real-time location tracking and navigation
- Route optimization for multiple deliveries
- Earnings calculation and performance metrics
- Customer communication and delivery completion

Use the available tools to manage your deliveries efficiently and maximize your earnings.`,

  client: `You are an AI assistant for bakery clients using Roni's ordering platform.
You help with inventory management, supplier coordination, and order placement.
Your capabilities include:
- Inventory tracking and management
- Supplier relationship coordination
- Order placement and tracking
- Product recommendations and analytics
- Supply chain optimization

Use the available tools to manage your bakery operations efficiently.`,

  customer: `You are a friendly shopping assistant for customers at Roni's Bakery.
You help customers find products, make recommendations, and provide information about fresh kosher products.
Your capabilities include:
- Product search and recommendations
- Availability checking and pricing
- Order placement assistance
- Personalized product suggestions
- Information about kosher certifications and ingredients

Use the available tools to provide excellent customer service and help customers find what they need.`
};

/**
 * Get role-specific database tools for the agent
 */
function getRoleTools(role: string) {
  const allTools = [];

  // Driver tools
  if (role === 'driver' || role === 'admin') {
    allTools.push(
      new GetMyDeliveriesTool(),
      new UpdateLocationTool(),
      new GetNavigationRouteTool(),
      new CompleteDeliveryTool(),
      new GetDriverEarningsTool()
    );
  }

  // Admin tools
  if (role === 'admin') {
    allTools.push(
      new GetSystemStatusTool(),
      new GetTenantOverviewTool(),
      new CreateTenantTool(),
      new UpdateTenantSubscriptionTool(),
      new GetSystemAnalyticsTool(),
      new ManageUserAccountsTool()
    );
  }

  // Get Agent SDK tools for other roles
  const roleSpecificTools = getAgentSDKTools(role);
  allTools.push(...roleSpecificTools);

  return allTools;
}

/**
 * Get available tools for a role (for debugging/info purposes)
 */
export function getAvailableTools(role: string): string[] {
  const tools = getRoleTools(role);
  return tools.map(tool => tool.name || tool.constructor.name || 'unnamed_tool');
}

/**
 * Create an Agent instance for a specific role
 * TODO: Complete Agent SDK integration
 */
async function createRoleAgent(role: string, context: AgentContext): Promise<any | null> {
  // Temporarily disabled for UI fixes and testing
  logger.info('Agent creation temporarily disabled for UI testing', { role });
  return null;
}

/**
 * Main unified agent execution function
 */
export async function executeUnifiedAgentsSDK(
  input: string,
  userId: string,
  userRole: string,
  tenantId?: number
): Promise<AgentResponse> {
  const requestId = `agents-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logContext = { requestId, userId, userRole, inputLength: input.length };
  
  logger.info('Unified Agents SDK execution started', logContext);
  
  try {
    const db = await getDb();
    const context: AgentContext = { userId, userRole, db, tenantId };

    logger.debug('Database connection established', logContext);

    // For now, use the existing unified agent implementation
    // TODO: Complete Agent SDK integration in future iteration
    logger.info('Using fallback unified agent implementation', logContext);
    const { executeUnifiedAgent } = await import('./unifiedOpenAIAgent');
    const fallbackResult = await executeUnifiedAgent(input, userId, userRole);
    
    return {
      ...fallbackResult,
      metadata: {
        role: userRole,
        userId: userId,
        executedTools: fallbackResult.toolCalls?.length || 0,
        fallbackMode: fallbackResult.fallbackMode,
        agentId: requestId
      }
    };
  } catch (error) {
    logger.error('Unified Agents SDK execution failed', logContext, error as Error);
    return {
      response: "I encountered an error while processing your request. Please try again or contact support if the issue persists.",
      fallbackMode: true,
      metadata: {
        role: userRole,
        userId,
        executedTools: 0,
        fallbackMode: true,
        agentId: requestId
      }
    };
  }
}

/**
 * Execute using OpenAI Agents SDK
 * TODO: Complete implementation when Agent SDK is properly integrated
 */
async function executeWithAgentsSDK(
  agent: any,
  input: string,
  context: AgentContext,
  requestId: string
): Promise<AgentResponse> {
  // Temporarily disabled
  logger.info('Agents SDK execution temporarily disabled', { requestId });
  throw new Error('Agents SDK execution not yet implemented');
}


/**
 * Health check for the Agents SDK
 */
export async function healthCheck(): Promise<{ 
  agentsSDK: boolean; 
  openaiKey: boolean; 
  database: boolean;
  supportedRoles: string[];
}> {
  try {
    const db = await getDb();
    await db.get('SELECT 1'); // Test database connection
    
    return {
      agentsSDK: !!openaiApiKey,
      openaiKey: !!openaiApiKey,
      database: true,
      supportedRoles: Object.keys(ROLE_PROMPTS)
    };
  } catch (error) {
    return {
      agentsSDK: !!openaiApiKey,
      openaiKey: !!openaiApiKey,
      database: false,
      supportedRoles: Object.keys(ROLE_PROMPTS)
    };
  }
}