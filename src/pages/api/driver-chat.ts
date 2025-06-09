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

    // Use the unified agent with driver role
    const result = await executeUnifiedAgent(message, session.user.id, 'driver');

    res.status(200).json({
      reply: result.response,
      toolCalls: result.toolCalls,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Driver chat error:', error);
    
    // Fallback response for errors
    const fallbackResponses = [
      "I'm having trouble connecting right now. Here are some common solutions:\n\n• Check your delivery schedule in the main app\n• Make sure your location services are enabled\n• Contact dispatch if you need immediate assistance",
      "I can't access the system right now, but I can still help! Common driver tasks:\n\n• Call customers using the phone button\n• Take photos for proof of delivery\n• Update your location manually if needed",
      "System temporarily unavailable. For immediate help:\n\n• Check the delivery details in your main screen\n• Use the navigation button for directions\n• Contact support if you have urgent issues"
    ];
    
    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    res.status(200).json({
      reply: fallbackResponse,
      timestamp: new Date().toISOString(),
      metadata: { error: true, fallback: true }
    });
  }
}