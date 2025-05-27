import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { orderId } = req.query;
  
  if (!orderId || isNaN(Number(orderId))) {
    return res.status(400).json({ error: 'Valid order ID is required' });
  }

  const db = await getDb();

  try {
    if (req.method === 'GET') {
      // Get delivery tracking information for this order
      const tracking = await db.get(`
        SELECT 
          dt.*,
          po.order_date,
          po.supplier_id,
          po.total_cost,
          s.name as supplier_name,
          s.address as supplier_address,
          dd.name as driver_name,
          dd.phone as driver_phone,
          dd.vehicle_registration
        FROM delivery_tracking dt
        JOIN purchase_orders po ON dt.order_id = po.id
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN delivery_drivers dd ON dt.driver_id = dd.id
        WHERE dt.order_id = ?
      `, [orderId]);

      if (!tracking) {
        return res.status(404).json({ error: 'Delivery tracking not found for this order' });
      }

      return res.status(200).json({ tracking });
    }

    if (req.method === 'POST') {
      // Update delivery tracking from mobile app
      const { 
        driverId,
        latitude, 
        longitude, 
        status, 
        deliveryNotes,
        departureTime,
        arrivalTime 
      } = req.body;

      if (!driverId) {
        return res.status(400).json({ error: 'Driver ID is required' });
      }

      // Verify this driver is assigned to this order
      const existingTracking = await db.get(
        'SELECT id FROM delivery_tracking WHERE order_id = ? AND driver_id = ?',
        [orderId, driverId]
      );

      if (!existingTracking) {
        return res.status(403).json({ error: 'Driver not authorized for this order' });
      }

      // Build update query dynamically based on provided data
      const updates = [];
      const values = [];

      if (latitude !== undefined && longitude !== undefined) {
        updates.push('current_latitude = ?', 'current_longitude = ?', 'last_location_update = CURRENT_TIMESTAMP');
        values.push(latitude, longitude);
      }

      if (status) {
        updates.push('status = ?');
        values.push(status);
      }

      if (deliveryNotes) {
        updates.push('delivery_notes = ?');
        values.push(deliveryNotes);
      }

      if (departureTime) {
        updates.push('actual_departure = ?');
        values.push(departureTime);
      }

      if (arrivalTime) {
        updates.push('actual_arrival = ?');
        values.push(arrivalTime);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(orderId, driverId);

        await db.run(
          `UPDATE delivery_tracking SET ${updates.join(', ')} WHERE order_id = ? AND driver_id = ?`,
          values
        );
      }

      // Update order status if delivery is completed
      if (status === 'delivered') {
        await db.run(
          'UPDATE purchase_orders SET status = ? WHERE id = ?',
          ['delivered', orderId]
        );
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Tracking updated successfully',
        orderId,
        status: status || 'updated'
      });
    }

    if (req.method === 'PUT') {
      // Assign driver to delivery (for suppliers)
      const { driverId, estimatedArrival } = req.body;

      if (!driverId) {
        return res.status(400).json({ error: 'Driver ID is required' });
      }

      // Check if tracking already exists
      const existingTracking = await db.get(
        'SELECT id FROM delivery_tracking WHERE order_id = ?',
        [orderId]
      );

      if (existingTracking) {
        // Update existing tracking
        await db.run(
          `UPDATE delivery_tracking 
           SET driver_id = ?, estimated_arrival = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
           WHERE order_id = ?`,
          [driverId, estimatedArrival, orderId]
        );
      } else {
        // Create new tracking record
        await db.run(
          `INSERT INTO delivery_tracking (order_id, driver_id, estimated_arrival, status)
           VALUES (?, ?, ?, 'assigned')`,
          [orderId, driverId, estimatedArrival]
        );
      }

      // Update order status to confirmed
      await db.run(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        ['confirmed', orderId]
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Driver assigned successfully',
        orderId,
        driverId
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in delivery tracking API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}