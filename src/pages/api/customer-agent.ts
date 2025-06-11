import { NextApiRequest, NextApiResponse } from 'next';
import { executeUnifiedAgent } from '@/agents/unifiedOpenAIAgent';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const requestId = `customer-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const logContext = {
    requestId,
    endpoint: '/api/customer-agent',
    userAgent: req.headers['user-agent'],
    ip: Array.isArray(req.headers['x-forwarded-for']) 
      ? req.headers['x-forwarded-for'][0] 
      : req.headers['x-forwarded-for'] || req.connection.remoteAddress
  };

  logger.apiRequest('POST', '/api/customer-agent', logContext);

  if (req.method !== 'POST') {
    logger.warn('Method not allowed', { ...logContext, method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, products, context } = req.body;
    
    logger.debug('Customer agent request received', {
      ...logContext,
      messageLength: message?.length || 0,
      productsCount: products?.length || 0,
      hasContext: !!context
    });
    
    if (!message) {
      logger.warn('Missing message in request', logContext);
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.agentRequest('customer', message, { ...logContext, sessionId: context?.sessionId });

    // Execute the unified agent with customer context
    const result = await executeUnifiedAgent(
      message, 
      context?.sessionId || 'customer-session', 
      'client'  // Use client role for customer interactions
    );

    logger.agentResponse('customer', result.response?.length || 0, result.toolCalls?.length || 0, logContext);

    // Parse response for product recommendations
    let recommendedProducts = [];
    if (result.response && products) {
      logger.debug('Processing product recommendations', {
        ...logContext,
        availableProducts: products.length
      });

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

        logger.info('Product recommendations generated', {
          ...logContext,
          matchedKeywords,
          recommendedCount: recommendedProducts.length
        });
      } else {
        logger.debug('No keyword matches found for recommendations', { ...logContext, messageWords });
      }
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/customer-agent', 200, duration, logContext);

    res.status(200).json({
      response: result.response,
      recommendedProducts,
      fallbackMode: result.fallbackMode
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Customer agent error', logContext, error as Error);
    logger.apiResponse('POST', '/api/customer-agent', 500, duration, logContext);
    
    res.status(500).json({ 
      error: 'Failed to process request',
      response: "I'm sorry, I'm having trouble right now. Please try browsing our products directly or contact us for assistance."
    });
  }
}