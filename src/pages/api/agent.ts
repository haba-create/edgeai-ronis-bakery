import { NextApiRequest, NextApiResponse } from 'next';
import { processAgentRequest } from '@/agents/agentImplementation';
import { initDatabase } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database if needed
    await initDatabase();
    
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }
    
    const response = await processAgentRequest(query);
    
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Error processing agent request:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing the request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
