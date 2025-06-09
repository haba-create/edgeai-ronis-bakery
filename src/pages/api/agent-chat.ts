import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';
import { getDb } from '@/utils/db';

interface ChatResponse {
  success: boolean;
  reply?: string;
  response?: string;
  error?: string;
  suggestions?: string[];
  toolCalls?: any[];
  metadata?: any;
  timestamp?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatResponse>) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed' 
      });
    }

    const { message, role } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    // Get user role from database if not provided
    let userRole = role;
    if (!userRole) {
      const db = await getDb();
      const user = await db.get('SELECT role FROM users WHERE id = ?', [session.user.id]);
      userRole = user?.role || 'client';
    }

    // Validate role
    const validRoles = ['client', 'supplier', 'driver', 'admin', 'tenant_admin', 'tenant_manager'];
    if (!validRoles.includes(userRole)) {
      userRole = 'client'; // Default fallback
    }

    // Use the unified agent with detected role
    const result = await executeUnifiedAgent(message, session.user.id, userRole);

    res.status(200).json({
      success: true,
      reply: result.response,
      response: result.response, // Support both field names for compatibility
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      suggestions: generateSuggestionsForRole(userRole),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent chat error:', error);
    
    res.status(200).json({
      success: false,
      reply: "I'm having trouble connecting right now. Please try again in a moment or contact support if the issue persists.",
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      metadata: { error: true, fallback: true }
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
        'Check my inventory',
        'Place a new order',
        'View recent orders',
        'Show analytics dashboard'
      ];
    
    case 'supplier':
      return [
        'Show my orders',
        'Update order status',
        'View performance metrics',
        'Check delivery schedule'
      ];
    
    case 'driver':
      return [
        'Show my deliveries',
        'Check earnings', 
        'Update delivery status',
        'Get route information'
      ];
    
    case 'admin':
    case 'tenant_admin':
    case 'tenant_manager':
      return [
        'Show all orders',
        'Assign deliveries',
        'System overview',
        'Manage users'
      ];
    
    default:
      return [
        'Help me get started',
        'Show available tools',
        'What can you do?'
      ];
  }
}