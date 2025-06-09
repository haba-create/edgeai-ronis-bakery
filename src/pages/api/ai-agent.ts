import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const { query, role } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Default to client role if no session
    const userRole = role || session?.user?.role || 'client';
    const userId = session?.user?.id || '1'; // Fallback user ID for testing

    console.log('Processing AI agent request:', query, 'Role:', userRole);
    const result = await executeUnifiedAgent(query, userId, userRole);
    
    return res.status(200).json({
      response: result.response,
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in AI agent handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}