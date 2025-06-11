import { NextApiRequest, NextApiResponse } from 'next';
import { getAllOrders, createOrder, generateRecommendedOrder } from '@/services/orderService';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const requestId = `orders-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const logContext = {
    requestId,
    endpoint: '/api/orders',
    userAgent: req.headers['user-agent'],
    ip: Array.isArray(req.headers['x-forwarded-for']) 
      ? req.headers['x-forwarded-for'][0] 
      : req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    recommended: req.query.recommended === 'true'
  };

  logger.apiRequest(req.method || 'GET', '/api/orders', logContext);

  try {
    if (req.method === 'GET') {
      // Check if we're requesting recommended orders
      if (req.query.recommended === 'true') {
        logger.debug('Generating recommended orders', logContext);
        const recommendations = await generateRecommendedOrder();
        
        logger.info('Order recommendations generated', {
          ...logContext,
          recommendationCount: Object.keys(recommendations).length,
          supplierIds: Object.keys(recommendations)
        });
        
        const duration = Date.now() - startTime;
        logger.apiResponse('GET', '/api/orders', 200, duration, logContext);
        
        return res.status(200).json({ recommendations });
      }
      
      // Get all orders
      logger.debug('Fetching all orders', logContext);
      const orders = await getAllOrders();
      
      logger.info('Orders retrieved successfully', {
        ...logContext,
        orderCount: orders.length,
        statuses: Array.from(new Set(orders.map((o: any) => o.status)))
      });
      
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/orders', 200, duration, logContext);
      
      return res.status(200).json({ orders });
    }
    
    if (req.method === 'POST') {
      const { supplier_id, items, notes } = req.body;
      
      logger.debug('Creating new order', {
        ...logContext,
        supplierId: supplier_id,
        itemCount: items?.length || 0,
        hasNotes: !!notes
      });
      
      if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
        logger.warn('Invalid order request body', {
          ...logContext,
          supplierId: supplier_id,
          itemsValid: Array.isArray(items),
          itemCount: items?.length || 0
        });
        
        const duration = Date.now() - startTime;
        logger.apiResponse('POST', '/api/orders', 400, duration, logContext);
        
        return res.status(400).json({ error: 'Invalid request body' });
      }
      
      // Validate items
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          logger.warn('Invalid item in order', {
            ...logContext,
            invalidItem: { productId: item.product_id, quantity: item.quantity }
          });
          
          const duration = Date.now() - startTime;
          logger.apiResponse('POST', '/api/orders', 400, duration, logContext);
          
          return res.status(400).json({
            error: 'Invalid item in order',
            details: 'Each item must have a product_id and a positive quantity'
          });
        }
      }
      
      const order = await createOrder(supplier_id, items, notes);
      
      logger.businessEvent('order_created', {
        orderId: order.id,
        supplierId: supplier_id,
        itemCount: items.length,
        totalCost: order.total_cost
      }, logContext);
      
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/orders', 201, duration, logContext);
      
      return res.status(201).json({ order });
    }
    
    // Method not allowed
    logger.warn('Method not allowed', { ...logContext, method: req.method });
    const duration = Date.now() - startTime;
    logger.apiResponse(req.method || 'UNKNOWN', '/api/orders', 405, duration, logContext);
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Orders API error', logContext, error as Error);
    logger.apiResponse(req.method || 'GET', '/api/orders', 500, duration, logContext);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
