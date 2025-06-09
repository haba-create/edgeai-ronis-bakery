import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify user has admin role
    const db = await getDb();
    const user = await db.get('SELECT role FROM users WHERE id = ?', [session.user.id]);
    
    if (!user || !['admin', 'tenant_admin', 'tenant_manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Use the unified agent with admin role
    const result = await executeUnifiedAgent(message, session.user.id, 'admin');

    res.status(200).json({
      reply: result.response,
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin agent error:', error);
    
    res.status(200).json({
      reply: "I'm having trouble accessing the admin functions right now. Please try again in a moment or check the main admin dashboard.",
      timestamp: new Date().toISOString(),
      metadata: { error: true, fallback: true }
    });
  }
}