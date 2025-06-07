/**
 * Driver Agent Tools
 * Tools for delivery status, navigation, and earnings tracking
 */

import { BaseTool } from '../base-tools';
import { AgentContext, DeliveryAssignment, LocationCoordinates, RouteInfo, DriverEarnings, PerformanceMetrics } from '../types';

/**
 * Get assigned deliveries for the driver
 */
export class GetMyDeliveriesTool extends BaseTool {
  name = 'get_my_deliveries';
  description = 'Get all deliveries assigned to the current driver';
  allowedRoles = ['driver', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description: 'Filter by delivery status (optional)',
        enum: ['assigned', 'pickup', 'in_transit', 'delivered', 'failed']
      },
      date: {
        type: 'string',
        description: 'Filter by specific date (YYYY-MM-DD, optional)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { status, date } = args;
    
    // For drivers, we need to find their driver record
    const user = await this.getUserInfo(context);
    let driverId: number;

    if (context.userRole === 'driver') {
      // Find driver record for this user
      const driverRecord = await context.db.get(
        'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
        [user?.email, user?.phone]
      );
      
      if (!driverRecord) {
        throw new Error('Driver record not found for this user');
      }
      driverId = driverRecord.id;
    } else {
      // Admin can specify driver_id or default to first driver
      driverId = args.driver_id || 1;
    }

    let query = `
      SELECT 
        dt.*,
        po.total_cost as order_value,
        po.status as order_status,
        t.name as tenant_name,
        t.address as delivery_address,
        t.phone as tenant_phone,
        ca.street_address, ca.city, ca.postcode, ca.delivery_instructions
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      LEFT JOIN client_orders co ON dt.client_order_id = co.id
      LEFT JOIN client_addresses ca ON co.delivery_address_id = ca.id
      WHERE dt.driver_id = ?
    `;
    const params = [driverId];

    if (status) {
      query += ' AND dt.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND DATE(dt.created_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY dt.created_at DESC';

    const deliveries = await context.db.all(query, params);

    // Add estimated earnings for each delivery
    const deliveriesWithEarnings = deliveries.map((delivery: any) => {
      const baseRate = 5.0; // Base delivery fee
      const distanceRate = 0.5; // Per km rate
      const estimatedEarnings = baseRate + (delivery.distance_km || 0) * distanceRate;

      return {
        ...delivery,
        estimated_earnings: Math.round(estimatedEarnings * 100) / 100,
        delivery_address_full: delivery.street_address 
          ? `${delivery.street_address}, ${delivery.city}, ${delivery.postcode}`
          : delivery.delivery_address,
        priority: this.calculateDeliveryPriority(delivery)
      };
    });

    await this.logToolUsage(context, this.name, args, { delivery_count: deliveriesWithEarnings.length });

    return deliveriesWithEarnings;
  }

  private calculateDeliveryPriority(delivery: any): 'high' | 'medium' | 'low' {
    const hoursUntilDelivery = delivery.estimated_arrival 
      ? (new Date(delivery.estimated_arrival).getTime() - Date.now()) / (1000 * 60 * 60)
      : 24;

    if (hoursUntilDelivery < 2) return 'high';
    if (hoursUntilDelivery < 6) return 'medium';
    return 'low';
  }
}

/**
 * Update current location and delivery status
 */
export class UpdateLocationTool extends BaseTool {
  name = 'update_location';
  description = 'Update current location and delivery status for real-time tracking';
  allowedRoles = ['driver', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      latitude: {
        type: 'number',
        description: 'Current latitude coordinate'
      },
      longitude: {
        type: 'number',
        description: 'Current longitude coordinate'
      },
      delivery_id: {
        type: 'number',
        description: 'ID of the delivery being tracked (optional if updating general location)'
      },
      status: {
        type: 'string',
        description: 'Current delivery status (optional)',
        enum: ['assigned', 'pickup', 'in_transit', 'delivered', 'failed']
      },
      speed_kmh: {
        type: 'number',
        description: 'Current speed in km/h (optional)'
      },
      heading: {
        type: 'number',
        description: 'Current heading in degrees (optional)'
      }
    },
    required: ['latitude', 'longitude']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { latitude, longitude, delivery_id, status, speed_kmh, heading } = args;
    
    // Get driver ID
    const user = await this.getUserInfo(context);
    let driverId: number;

    if (context.userRole === 'driver') {
      const driverRecord = await context.db.get(
        'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
        [user?.email, user?.phone]
      );
      
      if (!driverRecord) {
        throw new Error('Driver record not found for this user');
      }
      driverId = driverRecord.id;
    } else {
      driverId = args.driver_id || 1;
    }

    const currentTime = new Date().toISOString();

    // Update specific delivery if delivery_id provided
    if (delivery_id) {
      // Validate delivery belongs to driver
      const delivery = await context.db.get(
        'SELECT id FROM delivery_tracking WHERE id = ? AND driver_id = ?',
        [delivery_id, driverId]
      );

      if (!delivery) {
        throw new Error('Delivery not found or not assigned to this driver');
      }

      // Update delivery tracking
      let updateFields = ['current_latitude = ?', 'current_longitude = ?', 'last_location_update = ?'];
      let updateParams = [latitude, longitude, currentTime];

      if (status) {
        updateFields.push('status = ?');
        updateParams.push(status);

        // Set specific timestamps based on status
        if (status === 'pickup') {
          updateFields.push('actual_departure = ?');
          updateParams.push(currentTime);
        } else if (status === 'delivered') {
          updateFields.push('actual_arrival = ?');
          updateParams.push(currentTime);
        }
      }

      updateParams.push(delivery_id);

      await context.db.run(`
        UPDATE delivery_tracking 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateParams);
    }

    // Record route history for any active deliveries
    const activeDeliveries = await context.db.all(
      'SELECT id FROM delivery_tracking WHERE driver_id = ? AND status IN (?, ?, ?)',
      [driverId, 'assigned', 'pickup', 'in_transit']
    );

    for (const delivery of activeDeliveries) {
      await context.db.run(`
        INSERT INTO delivery_route_history (
          assignment_id, latitude, longitude, speed_kmh, heading, accuracy, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [delivery.id, latitude, longitude, speed_kmh, heading, 10, currentTime]);
    }

    const result = {
      driver_id: driverId,
      location: { latitude, longitude },
      timestamp: currentTime,
      delivery_id,
      status,
      active_deliveries_count: activeDeliveries.length
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Get navigation route to delivery location
 */
export class GetNavigationRouteTool extends BaseTool {
  name = 'get_navigation_route';
  description = 'Get navigation route and directions to delivery destination';
  allowedRoles = ['driver', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      delivery_id: {
        type: 'number',
        description: 'ID of the delivery to navigate to'
      },
      current_location: {
        type: 'object',
        description: 'Current location (optional, will use last known location if not provided)',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        }
      }
    },
    required: ['delivery_id']
  };

  protected async execute(args: any, context: AgentContext): Promise<RouteInfo> {
    const { delivery_id, current_location } = args;
    
    // Get driver ID
    const user = await this.getUserInfo(context);
    let driverId: number;

    if (context.userRole === 'driver') {
      const driverRecord = await context.db.get(
        'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
        [user?.email, user?.phone]
      );
      
      if (!driverRecord) {
        throw new Error('Driver record not found for this user');
      }
      driverId = driverRecord.id;
    } else {
      driverId = args.driver_id || 1;
    }

    // Get delivery details with destination coordinates
    const delivery = await context.db.get(`
      SELECT 
        dt.*,
        ca.latitude as dest_lat, ca.longitude as dest_lng,
        ca.street_address, ca.city, ca.postcode, ca.delivery_instructions,
        t.name as tenant_name
      FROM delivery_tracking dt
      LEFT JOIN client_orders co ON dt.client_order_id = co.id
      LEFT JOIN client_addresses ca ON co.delivery_address_id = ca.id
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE dt.id = ? AND dt.driver_id = ?
    `, [delivery_id, driverId]);

    if (!delivery) {
      throw new Error('Delivery not found or not assigned to this driver');
    }

    // Use provided current location or last known location
    let origin: LocationCoordinates;
    if (current_location) {
      origin = current_location;
    } else {
      origin = {
        latitude: delivery.current_latitude || 0,
        longitude: delivery.current_longitude || 0
      };
    }

    const destination: LocationCoordinates = {
      latitude: delivery.dest_lat || 0,
      longitude: delivery.dest_lng || 0
    };

    if (!destination.latitude || !destination.longitude) {
      throw new Error('Destination coordinates not available for this delivery');
    }

    // Calculate approximate distance and duration (simplified calculation)
    const distance_km = this.calculateDistance(origin, destination);
    const duration_minutes = Math.ceil(distance_km * 2.5); // Rough estimate: 2.5 minutes per km

    const routeInfo: RouteInfo = {
      origin,
      destination,
      distance_km: Math.round(distance_km * 100) / 100,
      duration_minutes
    };

    // Create waypoints for multi-stop deliveries (simplified)
    const otherDeliveries = await context.db.all(`
      SELECT ca.latitude, ca.longitude
      FROM delivery_tracking dt
      LEFT JOIN client_orders co ON dt.client_order_id = co.id
      LEFT JOIN client_addresses ca ON co.delivery_address_id = ca.id
      WHERE dt.driver_id = ? AND dt.status IN ('assigned', 'pickup') AND dt.id != ?
      LIMIT 3
    `, [driverId, delivery_id]);

    if (otherDeliveries.length > 0) {
      routeInfo.waypoints = otherDeliveries
        .filter((d: any) => d.latitude && d.longitude)
        .map((d: any) => ({ latitude: d.latitude, longitude: d.longitude }));
    }

    const result = {
      ...routeInfo,
      delivery_info: {
        delivery_id,
        tenant_name: delivery.tenant_name,
        address: `${delivery.street_address}, ${delivery.city}, ${delivery.postcode}`,
        instructions: delivery.delivery_instructions,
        estimated_arrival: delivery.estimated_arrival
      }
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }

  // Haversine formula for distance calculation
  private calculateDistance(point1: LocationCoordinates, point2: LocationCoordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Mark delivery as completed
 */
export class CompleteDeliveryTool extends BaseTool {
  name = 'complete_delivery';
  description = 'Mark a delivery as completed with proof and customer feedback';
  allowedRoles = ['driver', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      delivery_id: {
        type: 'number',
        description: 'ID of the delivery to complete'
      },
      completion_location: {
        type: 'object',
        description: 'Location where delivery was completed',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        },
        required: ['latitude', 'longitude']
      },
      proof_of_delivery: {
        type: 'string',
        description: 'Proof of delivery (photo URL, signature, etc., optional)'
      },
      customer_notes: {
        type: 'string',
        description: 'Notes from customer interaction (optional)'
      },
      delivery_issues: {
        type: 'string',
        description: 'Any issues encountered during delivery (optional)'
      }
    },
    required: ['delivery_id', 'completion_location']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { delivery_id, completion_location, proof_of_delivery, customer_notes, delivery_issues } = args;
    
    // Get driver ID
    const user = await this.getUserInfo(context);
    let driverId: number;

    if (context.userRole === 'driver') {
      const driverRecord = await context.db.get(
        'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
        [user?.email, user?.phone]
      );
      
      if (!driverRecord) {
        throw new Error('Driver record not found for this user');
      }
      driverId = driverRecord.id;
    } else {
      driverId = args.driver_id || 1;
    }

    // Validate delivery exists and belongs to driver
    const delivery = await context.db.get(`
      SELECT dt.*, po.total_cost, t.name as tenant_name
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE dt.id = ? AND dt.driver_id = ?
    `, [delivery_id, driverId]);

    if (!delivery) {
      throw new Error('Delivery not found or not assigned to this driver');
    }

    if (delivery.status === 'delivered') {
      throw new Error('Delivery is already marked as completed');
    }

    const completionTime = new Date().toISOString();

    await context.db.run('BEGIN TRANSACTION');

    try {
      // Update delivery tracking
      await context.db.run(`
        UPDATE delivery_tracking 
        SET 
          status = 'delivered',
          actual_arrival = ?,
          current_latitude = ?,
          current_longitude = ?,
          delivery_proof_url = ?,
          driver_notes = ?,
          last_location_update = ?
        WHERE id = ?
      `, [
        completionTime,
        completion_location.latitude,
        completion_location.longitude,
        proof_of_delivery,
        customer_notes,
        completionTime,
        delivery_id
      ]);

      // Update main order status
      if (delivery.order_id) {
        await context.db.run(
          'UPDATE purchase_orders SET status = ? WHERE id = ?',
          ['delivered', delivery.order_id]
        );
      }

      if (delivery.client_order_id) {
        await context.db.run(
          'UPDATE client_orders SET status = ?, actual_delivery = ? WHERE id = ?',
          ['delivered', completionTime, delivery.client_order_id]
        );
      }

      // Calculate delivery time and distance for earnings
      const startTime = new Date(delivery.actual_departure || delivery.created_at);
      const endTime = new Date(completionTime);
      const deliveryDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      await context.db.run('COMMIT');

      // Calculate earnings
      const baseRate = 5.0;
      const distanceRate = 0.5;
      const timeBonus = deliveryDurationMinutes < 30 ? 2.0 : 0;
      const earnings = baseRate + (delivery.distance_km || 0) * distanceRate + timeBonus;

      const result = {
        delivery_id,
        tenant_name: delivery.tenant_name,
        completion_time: completionTime,
        delivery_duration_minutes: deliveryDurationMinutes,
        earnings: Math.round(earnings * 100) / 100,
        completion_location,
        issues: delivery_issues || 'None reported'
      };

      await this.logToolUsage(context, this.name, args, result);

      return result;

    } catch (error) {
      await context.db.run('ROLLBACK');
      throw error;
    }
  }
}

/**
 * Get driver earnings and performance metrics
 */
export class GetDriverEarningsTool extends BaseTool {
  name = 'get_driver_earnings';
  description = 'Get earnings summary and performance metrics for the driver';
  allowedRoles = ['driver', 'admin'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      period: {
        type: 'string',
        description: 'Time period for earnings calculation',
        enum: ['today', 'week', 'month', 'custom']
      },
      start_date: {
        type: 'string',
        description: 'Start date for custom period (YYYY-MM-DD, required if period is custom)'
      },
      end_date: {
        type: 'string',
        description: 'End date for custom period (YYYY-MM-DD, required if period is custom)'
      }
    },
    required: ['period']
  };

  protected async execute(args: any, context: AgentContext): Promise<DriverEarnings & PerformanceMetrics> {
    const { period, start_date, end_date } = args;
    
    // Get driver ID
    const user = await this.getUserInfo(context);
    let driverId: number;

    if (context.userRole === 'driver') {
      const driverRecord = await context.db.get(
        'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
        [user?.email, user?.phone]
      );
      
      if (!driverRecord) {
        throw new Error('Driver record not found for this user');
      }
      driverId = driverRecord.id;
    } else {
      driverId = args.driver_id || 1;
    }

    // Calculate date range based on period
    let periodStart: string;
    let periodEnd: string;

    const now = new Date();
    
    switch (period) {
      case 'today':
        periodStart = now.toISOString().split('T')[0];
        periodEnd = periodStart;
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        periodStart = weekStart.toISOString().split('T')[0];
        periodEnd = now.toISOString().split('T')[0];
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        periodEnd = now.toISOString().split('T')[0];
        break;
      case 'custom':
        if (!start_date || !end_date) {
          throw new Error('start_date and end_date are required for custom period');
        }
        periodStart = start_date;
        periodEnd = end_date;
        break;
      default:
        throw new Error('Invalid period specified');
    }

    // Get delivery statistics
    const deliveryStats = await context.db.get(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deliveries,
        AVG(CASE WHEN actual_arrival IS NOT NULL AND estimated_arrival IS NOT NULL 
            THEN (julianday(estimated_arrival) - julianday(actual_arrival)) * 24 * 60 
            ELSE NULL END) as avg_time_difference_minutes,
        SUM(distance_km) as total_distance_km
      FROM delivery_tracking 
      WHERE driver_id = ? AND DATE(created_at) BETWEEN ? AND ?
    `, [driverId, periodStart, periodEnd]);

    // Calculate earnings (simplified calculation)
    const baseRatePerDelivery = 5.0;
    const ratePerKm = 0.5;
    const onTimeBonus = 2.0;

    const baseEarnings = deliveryStats.completed_deliveries * baseRatePerDelivery;
    const distanceEarnings = (deliveryStats.total_distance_km || 0) * ratePerKm;
    const bonusEarnings = deliveryStats.completed_deliveries * onTimeBonus * 0.8; // 80% get bonus
    const totalEarnings = baseEarnings + distanceEarnings + bonusEarnings;

    // Performance metrics
    const onTimeRate = deliveryStats.total_deliveries > 0 
      ? ((deliveryStats.completed_deliveries - deliveryStats.failed_deliveries) / deliveryStats.total_deliveries) * 100
      : 0;

    const avgRating = 4.2 + Math.random() * 0.6; // Simulated rating between 4.2-4.8

    // Calculate working hours (simplified)
    const workingDays = Math.max(1, Math.ceil((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24)));
    const estimatedWorkingHours = deliveryStats.completed_deliveries * 0.75; // 45 min per delivery
    const earningsPerHour = estimatedWorkingHours > 0 ? totalEarnings / estimatedWorkingHours : 0;

    const result: DriverEarnings & PerformanceMetrics = {
      driver_id: driverId,
      period_start: periodStart,
      period_end: periodEnd,
      total_deliveries: deliveryStats.completed_deliveries,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      base_pay: Math.round(baseEarnings * 100) / 100,
      tips: 0, // Not implemented in this system
      bonuses: Math.round(bonusEarnings * 100) / 100,
      deductions: 0, // Not implemented in this system
      on_time_delivery_rate: Math.round(onTimeRate * 100) / 100,
      customer_rating: Math.round(avgRating * 10) / 10,
      total_distance_km: Math.round((deliveryStats.total_distance_km || 0) * 100) / 100,
      fuel_efficiency: 12.5, // km/l (simulated)
      earnings_per_hour: Math.round(earningsPerHour * 100) / 100
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}