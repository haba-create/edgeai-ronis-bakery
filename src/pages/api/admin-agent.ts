import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';
import { getDb } from '@/utils/db';
import { addLog } from './logs/stream';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = `admin-agent-${Date.now()}`;
  
  try {
    addLog('INFO', 'Admin agent request received', { 
      requestId,
      method: req.method,
      hasBody: !!req.body,
      messageLength: req.body?.message?.length 
    });

    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      addLog('ERROR', 'Admin agent unauthorized - no session', { requestId });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    addLog('INFO', 'Admin agent session found', { 
      requestId,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role 
    });

    if (req.method !== 'POST') {
      addLog('ERROR', 'Admin agent invalid method', { requestId, method: req.method });
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;

    if (!message) {
      addLog('ERROR', 'Admin agent no message provided', { requestId });
      return res.status(400).json({ error: 'Message is required' });
    }

    addLog('INFO', 'Admin agent message received', { 
      requestId,
      message: message.substring(0, 100) + '...' 
    });

    // Verify user has admin role
    const db = await getDb();
    const user = await db.get('SELECT role FROM users WHERE id = ?', [session.user.id]);
    
    if (!user || !['admin', 'tenant_admin', 'tenant_manager'].includes(user.role)) {
      addLog('ERROR', 'Admin agent access denied', { 
        requestId,
        userId: session.user.id,
        actualRole: user?.role,
        requiredRoles: ['admin', 'tenant_admin', 'tenant_manager']
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    addLog('INFO', 'Admin agent executing unified agent', { 
      requestId,
      userId: session.user.id,
      role: 'admin' 
    });

    // Use the unified agent with admin role
    const result = await executeUnifiedAgent(message, session.user.id, 'admin');

    addLog('INFO', 'Admin agent execution complete', { 
      requestId,
      hasResponse: !!result.response,
      toolCallsCount: result.toolCalls?.length || 0,
      responseLength: result.response?.length 
    });

    res.status(200).json({
      reply: result.response,
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    addLog('ERROR', 'Admin agent error', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    console.error('Admin agent error:', error);
    
    res.status(200).json({
      reply: "I'm having trouble accessing the admin functions right now. Please try again in a moment or check the main admin dashboard.",
      timestamp: new Date().toISOString(),
      metadata: { error: true, fallback: true }
    });
  }
}