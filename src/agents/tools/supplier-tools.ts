/**
 * Supplier Agent Tools
 * Tools for order management, delivery coordination, and performance tracking
 */

import { BaseTool } from '../base-tools';
import { AgentContext, PurchaseOrder, DeliveryAssignment } from '../types';

/**
 * Get pending purchase orders for the supplier
 */
export class GetPendingOrdersTool extends BaseTool {
  name = 'get_pending_orders';
  description = 'Get all pending purchase orders for the supplier to review and confirm';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description: 'Filter by order status (optional)',
        enum: ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled']
      },
      tenant_id: {
        type: 'number',
        description: 'Filter by specific tenant/client (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of orders to return (optional, default 50)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { status = 'pending', tenant_id, limit = 50 } = args;
    
    // Get supplier ID for the current user
    const user = await this.getUserInfo(context);
    if (!user?.supplier_id) {
      throw new Error('User is not associated with a supplier');
    }

    let query = `
      SELECT po.*, t.name as tenant_name, t.primary_contact_email
      FROM purchase_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE po.supplier_id = ?
    `;
    const params = [user.supplier_id];

    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }

    if (tenant_id) {
      query += ' AND po.tenant_id = ?';
      params.push(tenant_id);
    }

    query += ' ORDER BY po.order_date DESC LIMIT ?';
    params.push(limit);

    const orders = await context.db.all(query, params);

    // Get items for each order
    for (const order of orders) {
      const items = await context.db.all(`
        SELECT oi.*, p.name as product_name, p.unit, p.description
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = items;
      order.total_items = items.length;
      order.total_quantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    }

    await this.logToolUsage(context, this.name, args, { order_count: orders.length });

    return orders;
  }
}

/**
 * Update order status and confirm delivery details
 */
export class UpdateOrderStatusTool extends BaseTool {
  name = 'update_order_status';
  description = 'Update the status of a purchase order and set delivery details';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      order_id: {
        type: 'number',
        description: 'ID of the purchase order to update'
      },
      status: {
        type: 'string',
        description: 'New status for the order',
        enum: ['confirmed', 'in_transit', 'delivered', 'cancelled']
      },
      expected_delivery: {
        type: 'string',
        description: 'Expected delivery date and time (YYYY-MM-DD HH:MM, optional)'
      },
      notes: {
        type: 'string',
        description: 'Additional notes about the status update (optional)'
      }
    },
    required: ['order_id', 'status']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { order_id, status, expected_delivery, notes } = args;
    
    // Get supplier ID for the current user
    const user = await this.getUserInfo(context);
    if (!user?.supplier_id) {
      throw new Error('User is not associated with a supplier');
    }

    // Validate order belongs to supplier
    const order = await context.db.get(`
      SELECT po.*, t.name as tenant_name
      FROM purchase_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE po.id = ? AND po.supplier_id = ?
    `, [order_id, user.supplier_id]);

    if (!order) {
      throw new Error('Order not found or not associated with your supplier');
    }

    // Update order
    await context.db.run(`
      UPDATE purchase_orders 
      SET status = ?, expected_delivery = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, expected_delivery, notes, order_id]);

    // Log the status change
    await context.db.run(`
      INSERT INTO order_api_logs (order_id, api_endpoint, request_payload, status_code)
      VALUES (?, 'update_order_status', ?, 200)
    `, [order_id, JSON.stringify(args)]);

    const result = {
      order_id,
      tenant_name: order.tenant_name,
      old_status: order.status,
      new_status: status,
      expected_delivery,
      notes
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Assign driver to delivery
 */
export class AssignDeliveryDriverTool extends BaseTool {
  name = 'assign_delivery_driver';
  description = 'Assign a driver to handle delivery for a confirmed order';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      order_id: {
        type: 'number',
        description: 'ID of the purchase order'
      },
      driver_id: {
        type: 'number',
        description: 'ID of the driver to assign'
      },
      estimated_arrival: {
        type: 'string',
        description: 'Estimated arrival time (YYYY-MM-DD HH:MM, optional)'
      },
      pickup_location: {
        type: 'object',
        description: 'Pickup location coordinates (optional)',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        }
      },
      delivery_notes: {
        type: 'string',
        description: 'Special delivery instructions (optional)'
      }
    },
    required: ['order_id', 'driver_id']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { order_id, driver_id, estimated_arrival, pickup_location, delivery_notes } = args;
    
    // Get supplier ID for the current user
    const user = await this.getUserInfo(context);
    if (!user?.supplier_id) {
      throw new Error('User is not associated with a supplier');
    }

    // Validate order belongs to supplier and is confirmed
    const order = await context.db.get(`
      SELECT po.*, t.name as tenant_name, t.address as tenant_address
      FROM purchase_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE po.id = ? AND po.supplier_id = ? AND po.status IN ('confirmed', 'in_transit')
    `, [order_id, user.supplier_id]);

    if (!order) {
      throw new Error('Order not found, not owned by your supplier, or not in confirmed status');
    }

    // Validate driver is available (not global drivers can be used by suppliers)
    const driver = await context.db.get(
      'SELECT * FROM delivery_drivers WHERE id = ? AND is_active = 1',
      [driver_id]
    );

    if (!driver) {
      throw new Error('Driver not found or not active');
    }

    // Check if driver is already assigned to this order
    const existingAssignment = await context.db.get(
      'SELECT id FROM delivery_tracking WHERE order_id = ? AND driver_id = ?',
      [order_id, driver_id]
    );

    if (existingAssignment) {
      throw new Error('Driver is already assigned to this order');
    }

    // Create delivery tracking record
    await context.db.run(`
      INSERT INTO delivery_tracking (
        order_id, driver_id, status, estimated_arrival,
        current_latitude, current_longitude, delivery_notes
      ) VALUES (?, ?, 'assigned', ?, ?, ?, ?)
    `, [
      order_id, 
      driver_id, 
      estimated_arrival,
      pickup_location?.latitude,
      pickup_location?.longitude,
      delivery_notes
    ]);

    const result = {
      order_id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      tenant_name: order.tenant_name,
      status: 'assigned',
      estimated_arrival
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Get supplier performance metrics
 */
export class GetSupplierPerformanceTool extends BaseTool {
  name = 'get_supplier_performance';
  description = 'Get performance metrics and analytics for the supplier';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date for performance analysis (YYYY-MM-DD)'
      },
      end_date: {
        type: 'string',
        description: 'End date for performance analysis (YYYY-MM-DD)'
      },
      tenant_id: {
        type: 'number',
        description: 'Filter by specific tenant (optional)'
      }
    },
    required: ['start_date', 'end_date']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { start_date, end_date, tenant_id } = args;
    
    // Get supplier ID for the current user
    const user = await this.getUserInfo(context);
    if (!user?.supplier_id) {
      throw new Error('User is not associated with a supplier');
    }

    // Base query for performance metrics
    let baseQuery = `
      FROM purchase_orders po
      LEFT JOIN delivery_tracking dt ON po.id = dt.order_id
      WHERE po.supplier_id = ? AND DATE(po.order_date) BETWEEN ? AND ?
    `;
    let baseParams = [user.supplier_id, start_date, end_date];

    if (tenant_id) {
      baseQuery += ' AND po.tenant_id = ?';
      baseParams.push(tenant_id);
    }

    // Get overall performance metrics
    const performance = await context.db.get(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN po.status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN po.status = 'cancelled' THEN 1 END) as cancelled_orders,
        AVG(CASE 
          WHEN po.status = 'delivered' AND dt.actual_arrival IS NOT NULL 
          THEN julianday(dt.actual_arrival) - julianday(po.expected_delivery)
          ELSE NULL 
        END) as avg_delivery_delay_days,
        SUM(po.total_cost) as total_revenue,
        AVG(po.total_cost) as avg_order_value
      ${baseQuery}
    `, baseParams);

    // Get on-time delivery rate
    const onTimeDeliveries = await context.db.get(`
      SELECT 
        COUNT(*) as on_time_count
      ${baseQuery}
      AND po.status = 'delivered' 
      AND dt.actual_arrival <= po.expected_delivery
    `, baseParams);

    // Get top clients
    const topClients = await context.db.all(`
      SELECT 
        t.name as tenant_name,
        COUNT(*) as order_count,
        SUM(po.total_cost) as total_spent
      FROM purchase_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE po.supplier_id = ? AND DATE(po.order_date) BETWEEN ? AND ?
      GROUP BY po.tenant_id, t.name
      ORDER BY total_spent DESC
      LIMIT 10
    `, [user.supplier_id, start_date, end_date]);

    // Calculate delivery performance
    const deliveryRate = performance.total_orders > 0 
      ? (performance.delivered_orders / performance.total_orders) * 100 
      : 0;

    const onTimeRate = performance.delivered_orders > 0 
      ? (onTimeDeliveries.on_time_count / performance.delivered_orders) * 100 
      : 0;

    const result = {
      period: { start_date, end_date },
      overall_performance: {
        total_orders: performance.total_orders,
        delivered_orders: performance.delivered_orders,
        cancelled_orders: performance.cancelled_orders,
        delivery_rate: Math.round(deliveryRate * 100) / 100,
        on_time_delivery_rate: Math.round(onTimeRate * 100) / 100,
        average_delivery_delay_days: Math.round((performance.avg_delivery_delay_days || 0) * 100) / 100,
        total_revenue: performance.total_revenue || 0,
        average_order_value: Math.round((performance.avg_order_value || 0) * 100) / 100
      },
      top_clients: topClients
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Get available drivers for assignment
 */
export class GetAvailableDriversTool extends BaseTool {
  name = 'get_available_drivers';
  description = 'Get list of available drivers for delivery assignments';
  allowedRoles = ['supplier', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      location: {
        type: 'object',
        description: 'Current location to find nearby drivers (optional)',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        }
      },
      active_only: {
        type: 'boolean',
        description: 'Show only active drivers (default: true)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { location, active_only = true } = args;
    
    // Get drivers (including global drivers available to all suppliers)
    let query = `
      SELECT 
        dd.*,
        COUNT(CASE WHEN dt.status IN ('assigned', 'pickup', 'in_transit') THEN 1 END) as active_deliveries
      FROM delivery_drivers dd
      LEFT JOIN delivery_tracking dt ON dd.id = dt.driver_id 
        AND dt.status IN ('assigned', 'pickup', 'in_transit')
      WHERE 1=1
    `;
    const params: any[] = [];

    if (active_only) {
      query += ' AND dd.is_active = 1';
    }

    query += ' GROUP BY dd.id ORDER BY active_deliveries ASC, dd.name';

    const drivers = await context.db.all(query, params);

    // Add availability status
    const driversWithStatus = drivers.map((driver: any) => ({
      ...driver,
      availability_status: driver.active_deliveries === 0 ? 'available' : 
                          driver.active_deliveries < 3 ? 'busy' : 'unavailable',
      current_load: driver.active_deliveries
    }));

    await this.logToolUsage(context, this.name, args, { driver_count: driversWithStatus.length });

    return driversWithStatus;
  }
}

/**
 * Update delivery status and location
 */
export class UpdateDeliveryStatusTool extends BaseTool {
  name = 'update_delivery_status';
  description = 'Update delivery status and current location for tracking';
  allowedRoles = ['supplier', 'driver', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      order_id: {
        type: 'number',
        description: 'ID of the purchase order'
      },
      status: {
        type: 'string',
        description: 'New delivery status',
        enum: ['assigned', 'pickup', 'in_transit', 'delivered', 'failed']
      },
      current_location: {
        type: 'object',
        description: 'Current location coordinates (optional)',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        }
      },
      notes: {
        type: 'string',
        description: 'Status update notes (optional)'
      }
    },
    required: ['order_id', 'status']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { order_id, status, current_location, notes } = args;
    
    // Validate delivery tracking exists
    const tracking = await context.db.get(`
      SELECT dt.*, po.tenant_id, dd.name as driver_name
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN delivery_drivers dd ON dt.driver_id = dd.id
      WHERE dt.order_id = ?
    `, [order_id]);

    if (!tracking) {
      throw new Error('Delivery tracking not found for this order');
    }

    // For supplier role, validate they own the order
    if (context.userRole === 'supplier') {
      const user = await this.getUserInfo(context);
      const order = await context.db.get(
        'SELECT supplier_id FROM purchase_orders WHERE id = ?',
        [order_id]
      );
      
      if (!order || order.supplier_id !== user?.supplier_id) {
        throw new Error('Order not found or not owned by your supplier');
      }
    }

    // Update delivery tracking
    let updateFields = ['status = ?', 'last_location_update = CURRENT_TIMESTAMP'];
    let updateParams = [status];

    if (current_location) {
      updateFields.push('current_latitude = ?', 'current_longitude = ?');
      updateParams.push(current_location.latitude, current_location.longitude);
    }

    if (notes) {
      updateFields.push('delivery_notes = ?');
      updateParams.push(notes);
    }

    // Set actual times based on status
    if (status === 'pickup') {
      updateFields.push('actual_departure = CURRENT_TIMESTAMP');
    } else if (status === 'delivered') {
      updateFields.push('actual_arrival = CURRENT_TIMESTAMP');
    }

    updateParams.push(order_id);

    await context.db.run(`
      UPDATE delivery_tracking 
      SET ${updateFields.join(', ')}
      WHERE order_id = ?
    `, updateParams);

    // Update main order status if delivered
    if (status === 'delivered') {
      await context.db.run(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        ['delivered', order_id]
      );
    }

    const result = {
      order_id,
      driver_name: tracking.driver_name,
      old_status: tracking.status,
      new_status: status,
      current_location,
      notes
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}