import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAutoOrder, createOrdersFromRecommendations } from '@/utils/auto-ordering';
import { sendOrderConfirmation } from '@/utils/email-service';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Generate order recommendations
    try {
      const { strategy = 'lowest_price', product_ids } = req.query;
      
      const tenantId = 1; // Default tenant for demo
      const productIdsArray = product_ids 
        ? (Array.isArray(product_ids) ? product_ids.map(Number) : [Number(product_ids)])
        : undefined;
      
      const recommendations = await generateAutoOrder(tenantId, productIdsArray);
      
      res.status(200).json(recommendations);
    } catch (error) {
      console.error('Auto-order generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate order recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'POST') {
    // Create orders from recommendations
    try {
      const { recommendations, send_notifications = true } = req.body;
      
      if (!recommendations || !Array.isArray(recommendations)) {
        return res.status(400).json({ error: 'Invalid recommendations data' });
      }
      
      const tenantId = 1; // Default tenant for demo
      const userId = parseInt(session.user.id);
      
      const orderIds = await createOrdersFromRecommendations(
        tenantId,
        recommendations,
        userId
      );
      
      // Send email notifications if requested
      const notifications = [];
      if (send_notifications) {
        for (const orderId of orderIds) {
          try {
            const sent = await sendOrderConfirmation(orderId);
            notifications.push({ order_id: orderId, email_sent: sent });
          } catch (error) {
            notifications.push({ 
              order_id: orderId, 
              email_sent: false, 
              error: error instanceof Error ? error.message : 'Failed to send email'
            });
          }
        }
      }
      
      res.status(200).json({
        success: true,
        orders_created: orderIds,
        email_notifications: notifications,
        message: `Successfully created ${orderIds.length} purchase orders`
      });
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(500).json({ 
        error: 'Failed to create orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}