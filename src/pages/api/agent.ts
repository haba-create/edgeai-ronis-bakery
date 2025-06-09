import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';
import { initDatabase } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database if needed
    await initDatabase();
    
    const session = await getServerSession(req, res, authOptions);
    
    const { query, role } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }
    
    // Determine role from session or request
    const userRole = role || session?.user?.role || 'client';
    const userId = session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const response = await executeUnifiedAgent(query, userId, userRole);
    
    return res.status(200).json({
      reply: response.response,
      toolCalls: response.toolCalls,
      metadata: response.metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing agent request:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing the request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
