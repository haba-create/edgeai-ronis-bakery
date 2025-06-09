import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const session = await getServerSession(req, res, authOptions);
      const { query, role } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Determine role from session or request
      const userRole = role || session?.user?.role || 'client';
      const userId = session?.user?.id;

      // Ensure we have a valid userId
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await executeUnifiedAgent(query, userId, userRole);
      
      return res.status(200).json({
        reply: result.response,
        toolCalls: result.toolCalls,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in OpenAI agent:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}