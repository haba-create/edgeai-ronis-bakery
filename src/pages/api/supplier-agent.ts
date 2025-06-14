import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';

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

    // Use the unified agent with supplier role
    const result = await executeUnifiedAgent(message, session.user.id, 'supplier');

    res.status(200).json({
      reply: result.response,
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Supplier agent error:', error);
    
    res.status(200).json({
      reply: "I'm having trouble accessing your supplier information right now. Please try again in a moment or check the main supplier dashboard for your orders.",
      timestamp: new Date().toISOString(),
      metadata: { error: true, fallback: true }
    });
  }
}