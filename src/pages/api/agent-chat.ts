/**
 * Agent Chat API Endpoint
 * Handles chat interactions with role-specific AI agents
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { runAgentWithContext } from '../../agents/agents';
import { initDatabase } from '../../utils/db';

interface ChatRequest {
  message: string;
  role: string;
  tenantId: number;
  userId: number;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  suggestions?: string[];
  tools_used?: string[];
  usage?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Initialize database
    await initDatabase();

    const { message, role, tenantId, userId }: ChatRequest = req.body;

    // Validate required parameters
    if (!message || !role || !tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: message, role, tenantId, userId'
      });
    }

    // Validate role
    const validRoles = ['client', 'supplier', 'driver', 'admin', 'tenant_admin', 'tenant_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }

    // Run the appropriate agent
    const result = await runAgentWithContext(role, message, tenantId, userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        response: result.response,
        suggestions: generateSuggestionsForRole(role),
        tools_used: result.tools_used,
        usage: result.usage
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        response: result.response
      });
    }

  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      response: 'I apologize, but I encountered an error processing your request. Please try again later.'
    });
  }
}

/**
 * Generate role-specific suggestions for follow-up actions
 */
function generateSuggestionsForRole(role: string): string[] {
  switch (role) {
    case 'client':
      return [
        'Check low stock items',
        'Create purchase order',
        'View recent orders',
        'Show analytics dashboard',
        'Update consumption'
      ];
    
    case 'supplier':
      return [
        'Show pending orders',
        'Update order status',
        'Assign delivery driver',
        'View performance metrics',
        'Check available drivers'
      ];
    
    case 'driver':
      return [
        'Show my deliveries',
        'Update my location', 
        'Get navigation route',
        'Complete delivery',
        'View earnings summary'
      ];
    
    case 'admin':
    case 'tenant_admin':
    case 'tenant_manager':
      return [
        'System status check',
        'Tenant overview',
        'Create new tenant',
        'Manage users',
        'View system analytics'
      ];
    
    default:
      return [
        'Help me get started',
        'Show available tools',
        'What can you do?'
      ];
  }
}

/**
 * Rate limiting and security middleware (simplified)
 */
function validateRequest(req: NextApiRequest): { valid: boolean; error?: string } {
  // Basic validation - in production, add proper authentication
  const { message, tenantId, userId } = req.body;
  
  if (typeof message !== 'string' || message.length > 2000) {
    return { valid: false, error: 'Invalid message format or length' };
  }
  
  if (!Number.isInteger(tenantId) || tenantId <= 0) {
    return { valid: false, error: 'Invalid tenant ID' };
  }
  
  if (!Number.isInteger(userId) || userId <= 0) {
    return { valid: false, error: 'Invalid user ID' };
  }
  
  return { valid: true };
}