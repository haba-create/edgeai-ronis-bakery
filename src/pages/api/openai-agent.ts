import { NextApiRequest, NextApiResponse } from 'next';
import { executeAgent } from '@/agents/openaiAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await executeAgent(query);
      
      return res.status(200).json(result);
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