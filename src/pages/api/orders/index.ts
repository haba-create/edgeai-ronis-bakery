import { NextApiRequest, NextApiResponse } from 'next';
import { getAllOrders, createOrder, generateRecommendedOrder } from '@/services/orderService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Check if we're requesting recommended orders
      if (req.query.recommended === 'true') {
        const recommendations = await generateRecommendedOrder();
        return res.status(200).json({ recommendations });
      }
      
      // Get all orders
      const orders = await getAllOrders();
      return res.status(200).json({ orders });
    }
    
    if (req.method === 'POST') {
      const { supplier_id, items, notes } = req.body;
      
      if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
      
      // Validate items
      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({
            error: 'Invalid item in order',
            details: 'Each item must have a product_id and a positive quantity'
          });
        }
      }
      
      const order = await createOrder(supplier_id, items, notes);
      return res.status(201).json({ order });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling orders request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
