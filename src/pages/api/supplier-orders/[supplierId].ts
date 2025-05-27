import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { supplierId } = req.query;
  
  if (!supplierId || isNaN(Number(supplierId))) {
    return res.status(400).json({ error: 'Valid supplier ID is required' });
  }

  const db = await getDb();

  try {
    if (req.method === 'GET') {
      // Get all orders for this supplier
      const orders = await db.all(`
        SELECT 
          po.*,
          GROUP_CONCAT(
            oi.product_id || ':' || oi.quantity || ':' || oi.unit_price || ':' || p.name
          ) as items,
          dt.status as delivery_status,
          dt.current_latitude,
          dt.current_longitude,
          dt.estimated_arrival,
          dt.actual_departure,
          dt.actual_arrival,
          dd.name as driver_name,
          dd.phone as driver_phone
        FROM purchase_orders po
        LEFT JOIN order_items oi ON po.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN delivery_tracking dt ON po.id = dt.order_id
        LEFT JOIN delivery_drivers dd ON dt.driver_id = dd.id
        WHERE po.supplier_id = ?
        GROUP BY po.id
        ORDER BY po.order_date DESC
      `, [supplierId]);

      // Parse the items for each order
      const formattedOrders = orders.map(order => ({
        ...order,
        items: order.items ? order.items.split(',').map((item: string) => {
          const [product_id, quantity, unit_price, name] = item.split(':');
          return {
            product_id: parseInt(product_id),
            quantity: parseFloat(quantity),
            unit_price: parseFloat(unit_price),
            product_name: name
          };
        }) : []
      }));

      return res.status(200).json({ orders: formattedOrders });
    }

    if (req.method === 'POST') {
      // Webhook endpoint for supplier to update order status
      const { orderId, status, estimatedDelivery, driverId, notes } = req.body;

      if (!orderId || !status) {
        return res.status(400).json({ error: 'Order ID and status are required' });
      }

      // Update the order status
      await db.run(
        'UPDATE purchase_orders SET status = ?, notes = COALESCE(?, notes) WHERE id = ? AND supplier_id = ?',
        [status, notes, orderId, supplierId]
      );

      // Log the API call
      await db.run(
        `INSERT INTO order_api_logs (order_id, api_endpoint, request_payload, status_code)
         VALUES (?, ?, ?, ?)`,
        [orderId, `/api/supplier-orders/${supplierId}`, JSON.stringify(req.body), 200]
      );

      // If delivery information is provided, update delivery tracking
      if (status === 'confirmed' || status === 'shipped') {
        const existingTracking = await db.get(
          'SELECT id FROM delivery_tracking WHERE order_id = ?',
          [orderId]
        );

        if (existingTracking) {
          await db.run(
            `UPDATE delivery_tracking 
             SET status = ?, estimated_arrival = ?, driver_id = COALESCE(?, driver_id), updated_at = CURRENT_TIMESTAMP
             WHERE order_id = ?`,
            [status === 'shipped' ? 'in_transit' : 'assigned', estimatedDelivery, driverId, orderId]
          );
        } else if (driverId) {
          await db.run(
            `INSERT INTO delivery_tracking (order_id, driver_id, status, estimated_arrival)
             VALUES (?, ?, ?, ?)`,
            [orderId, driverId, status === 'shipped' ? 'in_transit' : 'assigned', estimatedDelivery]
          );
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Order status updated successfully',
        orderId,
        status
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in supplier orders API:', error);
    
    // Log the error
    if (req.body?.orderId) {
      await db.run(
        `INSERT INTO order_api_logs (order_id, api_endpoint, request_payload, status_code)
         VALUES (?, ?, ?, ?)`,
        [req.body.orderId, `/api/supplier-orders/${supplierId}`, JSON.stringify(req.body), 500]
      );
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}