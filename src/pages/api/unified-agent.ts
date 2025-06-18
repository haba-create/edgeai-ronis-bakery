/**
 * Unified Agent API Endpoint
 * Single endpoint for all role-based AI interactions using OpenAI Agents SDK
 * Replaces all individual agent endpoints
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgentsSDK, healthCheck } from '@/agents/unifiedAgentsSDK';
import { logger } from '@/utils/logger';

interface AgentRequest {
  message: string;
  role?: string; // Override user role (admin only)
  context?: any; // Additional context
}

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
  error?: string;
}

/**
 * Role detection and validation
 */
function detectUserRole(session: any, requestedRole?: string): string {
  // If admin requests specific role override, allow it
  if (requestedRole && session?.user?.role === 'admin') {
    return requestedRole;
  }

  // For demo purposes, allow role override when no session (testing)
  if (requestedRole && !session) {
    return requestedRole;
  }

  // Use session role or fallback to customer
  return session?.user?.role || 'customer';
}

/**
 * Get user ID from session or use mock for testing
 */
function getUserId(session: any, detectedRole: string): string {
  if (session?.user?.id) {
    return session.user.id.toString();
  }

  // Mock user IDs for testing based on detected role
  const mockUserIds: { [key: string]: string } = {
    admin: '1',
    owner: '2', 
    supplier: '1002', // Heritage Jewish Breads supplier (supplier@hjb.com)
    driver: '4',
    client: '5',
    customer: '6'
  };

  return mockUserIds[detectedRole] || '6';
}

/**
 * Get tenant ID from session
 */
function getTenantId(session: any): number | undefined {
  return session?.user?.tenantId ? parseInt(session.user.tenantId) : undefined;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      response: '',
      error: `Method ${req.method} Not Allowed`
    });
  }

  const requestId = `unified-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Get session for authentication
    const session = await getServerSession(req, res, authOptions);
    
    // Allow unauthenticated requests for demo purposes
    // In production, you might want to require authentication
    const userRole = detectUserRole(session, req.body.role);
    const userId = getUserId(session, userRole);
    const tenantId = getTenantId(session);

    logger.info('Unified agent request received', {
      requestId,
      userId,
      userRole,
      tenantId,
      authenticated: !!session,
      messageLength: req.body.message?.length || 0
    });

    // Validate request body
    const { message, context }: AgentRequest = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        response: '',
        error: 'Message is required and must be a non-empty string'
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        response: '',
        error: 'Message too long. Maximum 4000 characters allowed.'
      });
    }

    // Rate limiting (simple implementation)
    // In production, you'd use Redis or similar
    const rateLimitKey = `rate_limit_${userId}`;
    // TODO: Implement proper rate limiting

    // Execute the unified agent
    const agentResponse = await executeUnifiedAgentsSDK(
      message.trim(),
      userId,
      userRole,
      tenantId
    );

    logger.info('Unified agent execution completed', {
      requestId,
      userId,
      userRole,
      toolsExecuted: agentResponse.toolCalls?.length || 0,
      fallbackMode: agentResponse.fallbackMode,
      responseLength: agentResponse.response.length
    });

    // Return successful response
    res.status(200).json({
      ...agentResponse,
      metadata: {
        role: userRole,
        userId: userId,
        executedTools: agentResponse.toolCalls?.length || 0,
        fallbackMode: agentResponse.fallbackMode,
        agentId: requestId
      }
    });

  } catch (error) {
    logger.error('Unified agent request failed', { requestId }, error as Error);

    // Return error response
    res.status(500).json({
      response: "I apologize, but I encountered an error while processing your request. Please try again in a moment.",
      error: process.env.NODE_ENV === 'development' 
        ? (error as Error).message 
        : 'Internal server error',
      fallbackMode: true,
      metadata: {
        role: 'unknown',
        userId: 'unknown',
        executedTools: 0,
        fallbackMode: true,
        agentId: requestId
      }
    });
  }
}

/**
 * Health check endpoint (GET request)
 */
export async function healthCheckHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const health = await healthCheck();
    const status = health.agentsSDK && health.database ? 200 : 503;
    
    res.status(status).json({
      status: status === 200 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      ...health
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
}

// Handle both POST (chat) and GET (health) on same endpoint
export { handler as default, healthCheckHandler as health };