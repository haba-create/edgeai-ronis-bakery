import { NextApiRequest, NextApiResponse } from 'next';
import { executeOpenAIAgent } from '@/agents/openaiAgentWithTools';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('Processing AI agent request:', query);
    const result = await executeOpenAIAgent(query);
    
    return res.status(200).json({
      response: result.message,
      toolCalls: result.toolCalls,
      error: result.error
    });
  } catch (error) {
    console.error('Error in AI agent handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}