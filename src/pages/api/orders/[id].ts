import { NextApiRequest, NextApiResponse } from 'next';
import { getOrderById, updateOrderStatus } from '@/services/orderService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const orderId = parseInt(id as string);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    if (req.method === 'GET') {
      const order = await getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      return res.status(200).json({ order });
    }
    
    if (req.method === 'PATCH') {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      // Validate status
      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status',
          details: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      const updatedOrder = await updateOrderStatus(orderId, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      return res.status(200).json({ order: updatedOrder });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling order request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
