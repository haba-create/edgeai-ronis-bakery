import { NextApiRequest, NextApiResponse } from 'next';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId = '1000' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Testing driver agent with userId:', userId, 'message:', message);

    // Test the unified agent with driver role and hardcoded user ID
    const result = await executeUnifiedAgent(message, userId, 'driver');

    console.log('Agent result:', JSON.stringify(result, null, 2));

    res.status(200).json({
      reply: result.response,
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      timestamp: new Date().toISOString(),
      testMode: true
    });

  } catch (error) {
    console.error('Test driver agent error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}