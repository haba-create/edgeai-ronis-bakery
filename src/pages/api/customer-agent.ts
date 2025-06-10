import { NextApiRequest, NextApiResponse } from 'next';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, products, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Execute the unified agent with customer context
    const result = await executeUnifiedAgent(
      message, 
      context?.sessionId || 'customer-session', 
      'client'  // Use client role for customer interactions
    );

    // Parse response for product recommendations
    let recommendedProducts = [];
    if (result.response && products) {
      // Simple keyword matching for product recommendations
      const messageWords = message.toLowerCase().split(' ');
      const keywords = ['bread', 'coffee', 'milk', 'cheese', 'bagel', 'produce', 'fresh', 'kosher'];
      
      const matchedKeywords = messageWords.filter((word: string) => 
        keywords.some((keyword: string) => word.includes(keyword) || keyword.includes(word))
      );
      
      if (matchedKeywords.length > 0) {
        recommendedProducts = products
          .filter((product: any) => 
            matchedKeywords.some((keyword: string) => 
              product.name.toLowerCase().includes(keyword) ||
              product.category.toLowerCase().includes(keyword)
            )
          )
          .slice(0, 3);
      }
    }

    res.status(200).json({
      response: result.response,
      recommendedProducts,
      fallbackMode: result.fallbackMode
    });
  } catch (error) {
    console.error('Customer agent error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      response: "I'm sorry, I'm having trouble right now. Please try browsing our products directly or contact us for assistance."
    });
  }
}