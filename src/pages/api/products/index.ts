import { NextApiRequest, NextApiResponse } from 'next';
import { getAllProducts, getProductCategories } from '@/services/productService';
import { initDatabase } from '@/utils/db';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const requestId = `products-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const logContext = {
    requestId,
    endpoint: '/api/products',
    userAgent: req.headers['user-agent'],
    ip: Array.isArray(req.headers['x-forwarded-for']) 
      ? req.headers['x-forwarded-for'][0] 
      : req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    categoriesOnly: req.query.categories === 'true'
  };

  logger.apiRequest(req.method || 'GET', '/api/products', logContext);

  try {
    logger.debug('Initializing database for products API', logContext);
    await initDatabase();
    
    if (req.method === 'GET') {
      // Check if we're requesting categories only
      if (req.query.categories === 'true') {
        logger.debug('Fetching product categories', logContext);
        const categories = await getProductCategories();
        
        logger.info('Product categories retrieved', {
          ...logContext,
          categoryCount: categories.length
        });
        
        const duration = Date.now() - startTime;
        logger.apiResponse('GET', '/api/products', 200, duration, logContext);
        
        return res.status(200).json({ categories });
      }
      
      // Get all products
      logger.debug('Fetching all products', logContext);
      const products = await getAllProducts();
      
      logger.info('Products retrieved successfully', {
        ...logContext,
        productCount: products.length,
        categories: Array.from(new Set(products.map((p: any) => p.category)))
      });
      
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/products', 200, duration, logContext);
      
      return res.status(200).json({ products });
    }
    
    // Method not allowed
    logger.warn('Method not allowed', { ...logContext, method: req.method });
    const duration = Date.now() - startTime;
    logger.apiResponse(req.method || 'UNKNOWN', '/api/products', 405, duration, logContext);
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Product API error', logContext, error as Error);
    logger.apiResponse(req.method || 'GET', '/api/products', 500, duration, logContext);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
