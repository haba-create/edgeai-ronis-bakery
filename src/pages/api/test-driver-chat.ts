import { NextApiRequest, NextApiResponse } from 'next';
import { executeDriverAgent } from '@/agents/driverAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Test with the actual driver user ID (bypassing authentication for testing)
    const result = await executeDriverAgent(
      message, 
      '31', // Actual driver user ID from database
      'driver'
    );

    res.status(200).json({
      reply: result.response,
      suggestedActions: result.suggestedActions,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test driver chat error:', error);
    
    res.status(200).json({
      reply: "Test Error: " + (error instanceof Error ? error.message : String(error)),
      timestamp: new Date().toISOString(),
      metadata: { error: true, test: true }
    });
  }
}