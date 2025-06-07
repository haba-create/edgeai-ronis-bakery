/**
 * Client Agent Tools
 * Tools for inventory management, ordering, and analytics specific to client users
 */

import { BaseTool } from '../base-tools';
import { AgentContext, Product, ClientOrder, InventoryAnalytics, OrderAnalytics, LimitOperation } from '../types';

/**
 * Get inventory status with low stock alerts and predictions
 */
export class GetInventoryStatusTool extends BaseTool {
  name = 'get_inventory_status';
  description = 'Get current inventory status including stock levels, low stock alerts, and stockout predictions';
  allowedRoles = ['client', 'admin', 'tenant_admin', 'tenant_manager'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string',
        description: 'Filter by product category (optional)'
      },
      low_stock_only: {
        type: 'boolean',
        description: 'Show only items with low stock (optional)'
      },
      include_predictions: {
        type: 'boolean',
        description: 'Include stockout predictions (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of items to return (optional, default 50)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { category, low_stock_only, include_predictions, limit = 50 } = args;
    
    let query = `
      SELECT p.*, s.name as supplier_name, s.lead_time as supplier_lead_time
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.tenant_id = ?
    `;
    const params = [context.tenantId];

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (low_stock_only) {
      query += ' AND p.current_stock <= p.reorder_point';
    }

    query += ' ORDER BY p.current_stock ASC LIMIT ?';
    params.push(limit);

    const products = await context.db.all(query, params);

    // Calculate additional metrics
    const result = products.map((product: any) => {
      const stockStatus = this.getStockStatus(product);
      const daysUntilStockout = this.calculateDaysUntilStockout(product);
      
      return {
        ...product,
        stock_status: stockStatus,
        days_until_stockout: include_predictions ? daysUntilStockout : undefined,
        reorder_needed: product.current_stock <= product.reorder_point,
        stock_percentage: Math.round((product.current_stock / product.optimal_stock) * 100)
      };
    });

    // Get summary statistics
    const summary = {
      total_products: result.length,
      low_stock_count: result.filter((p: any) => p.reorder_needed).length,
      out_of_stock_count: result.filter((p: any) => p.current_stock <= 0).length,
      critical_items: result.filter((p: any) => p.stock_status === 'critical').length
    };

    await this.logToolUsage(context, this.name, args, { summary, item_count: result.length });

    return {
      summary,
      products: result
    };
  }

  private getStockStatus(product: any): string {
    if (product.current_stock <= 0) return 'out_of_stock';
    if (product.current_stock <= product.reorder_point * 0.5) return 'critical';
    if (product.current_stock <= product.reorder_point) return 'low';
    if (product.current_stock >= product.optimal_stock) return 'optimal';
    return 'adequate';
  }

  private calculateDaysUntilStockout(product: any): number | null {
    if (product.daily_usage <= 0) return null;
    return Math.floor(product.current_stock / product.daily_usage);
  }
}

/**
 * Create a purchase order for suppliers
 */
export class CreatePurchaseOrderTool extends BaseTool {
  name = 'create_purchase_order';
  description = 'Create a new purchase order for products from suppliers';
  allowedRoles = ['client', 'admin', 'tenant_admin', 'tenant_manager'];
  requiresLimitValidation = true;
  limitOperation: LimitOperation = 'place_order';
  
  parameters = {
    type: 'object' as const,
    properties: {
      supplier_id: {
        type: 'number',
        description: 'ID of the supplier to order from'
      },
      items: {
        type: 'array',
        description: 'Array of items to order',
        items: {
          type: 'object',
          properties: {
            product_id: { type: 'number' },
            quantity: { type: 'number' }
          },
          required: ['product_id', 'quantity']
        }
      },
      expected_delivery: {
        type: 'string',
        description: 'Expected delivery date (YYYY-MM-DD format, optional)'
      },
      notes: {
        type: 'string',
        description: 'Additional notes for the order (optional)'
      }
    },
    required: ['supplier_id', 'items']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { supplier_id, items, expected_delivery, notes } = args;

    // Validate supplier belongs to tenant or is global
    const supplier = await context.db.get(`
      SELECT s.*, ts.is_active as tenant_active
      FROM suppliers s
      LEFT JOIN tenant_suppliers ts ON s.id = ts.supplier_id AND ts.tenant_id = ?
      WHERE s.id = ? AND (s.is_global = 1 OR ts.tenant_id = ?)
    `, [context.tenantId, supplier_id, context.tenantId]);

    if (!supplier) {
      throw new Error('Supplier not found or not available for this tenant');
    }

    // Validate all products belong to tenant
    const productIds = items.map((item: any) => item.product_id);
    const products = await context.db.all(`
      SELECT id, name, price FROM products 
      WHERE id IN (${productIds.map(() => '?').join(',')}) AND tenant_id = ?
    `, [...productIds, context.tenantId]);

    if (products.length !== items.length) {
      throw new Error('One or more products not found or not available');
    }

    // Calculate total cost
    let totalCost = 0;
    const orderItems = items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      const itemCost = product.price * item.quantity;
      totalCost += itemCost;
      
      return {
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemCost
      };
    });

    // Create purchase order
    const orderResult = await context.db.run(`
      INSERT INTO purchase_orders (
        tenant_id, order_date, supplier_id, status, expected_delivery, total_cost, notes
      ) VALUES (?, CURRENT_TIMESTAMP, ?, 'pending', ?, ?, ?)
    `, [context.tenantId, supplier_id, expected_delivery, totalCost, notes]);

    const orderId = orderResult.lastID;

    // Create order items
    for (const item of items) {
      const product = products.find((p: any) => p.id === item.product_id);
      await context.db.run(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.product_id, item.quantity, product.price]);
    }

    const result = {
      order_id: orderId,
      supplier_name: supplier.name,
      total_cost: totalCost,
      items: orderItems,
      status: 'pending',
      expected_delivery
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Get order history and status
 */
export class GetOrderHistoryTool extends BaseTool {
  name = 'get_order_history';
  description = 'Get purchase order history and current status';
  allowedRoles = ['client', 'admin', 'tenant_admin', 'tenant_manager'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description: 'Filter by order status (optional)',
        enum: ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled']
      },
      supplier_id: {
        type: 'number',
        description: 'Filter by supplier ID (optional)'
      },
      date_from: {
        type: 'string',
        description: 'Start date filter (YYYY-MM-DD, optional)'
      },
      date_to: {
        type: 'string',
        description: 'End date filter (YYYY-MM-DD, optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of orders to return (optional, default 20)'
      }
    }
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { status, supplier_id, date_from, date_to, limit = 20 } = args;
    
    let query = `
      SELECT po.*, s.name as supplier_name, s.contact as supplier_contact
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.tenant_id = ?
    `;
    const params = [context.tenantId];

    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }

    if (supplier_id) {
      query += ' AND po.supplier_id = ?';
      params.push(supplier_id);
    }

    if (date_from) {
      query += ' AND DATE(po.order_date) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(po.order_date) <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY po.order_date DESC LIMIT ?';
    params.push(limit);

    const orders = await context.db.all(query, params);

    // Get items for each order
    for (const order of orders) {
      const items = await context.db.all(`
        SELECT oi.*, p.name as product_name, p.unit
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = items;
    }

    await this.logToolUsage(context, this.name, args, { order_count: orders.length });

    return orders;
  }
}

/**
 * Get inventory analytics and insights
 */
export class GetInventoryAnalyticsTool extends BaseTool {
  name = 'get_inventory_analytics';
  description = 'Get comprehensive inventory analytics including turnover, trends, and performance metrics';
  allowedRoles = ['client', 'admin', 'tenant_admin', 'tenant_manager'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date for analytics (YYYY-MM-DD)'
      },
      end_date: {
        type: 'string',
        description: 'End date for analytics (YYYY-MM-DD)'
      },
      category: {
        type: 'string',
        description: 'Filter by product category (optional)'
      }
    },
    required: ['start_date', 'end_date']
  };

  protected async execute(args: any, context: AgentContext): Promise<InventoryAnalytics> {
    const { start_date, end_date, category } = args;
    
    // Basic inventory counts
    let countQuery = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN current_stock <= reorder_point THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN current_stock <= 0 THEN 1 END) as out_of_stock_items,
        SUM(current_stock * price) as total_value
      FROM products 
      WHERE tenant_id = ?
    `;
    const countParams = [context.tenantId];

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    const counts = await context.db.get(countQuery, countParams);

    // Get top selling products
    let topProductsQuery = `
      SELECT 
        p.name as product_name,
        SUM(coi.quantity) as units_sold,
        SUM(coi.total_price) as revenue
      FROM client_order_items coi
      JOIN products p ON coi.product_id = p.id
      JOIN client_orders co ON coi.order_id = co.id
      WHERE co.tenant_id = ? AND DATE(co.created_at) BETWEEN ? AND ?
    `;
    const topProductsParams = [context.tenantId, start_date, end_date];

    if (category) {
      topProductsQuery += ' AND p.category = ?';
      topProductsParams.push(category);
    }

    topProductsQuery += ' GROUP BY p.id, p.name ORDER BY units_sold DESC LIMIT 10';

    const topProducts = await context.db.all(topProductsQuery, topProductsParams);

    // Calculate turnover rate (simplified)
    const avgStockValue = counts.total_value;
    const totalRevenue = topProducts.reduce((sum: number, p: any) => sum + p.revenue, 0);
    const turnoverRate = avgStockValue > 0 ? totalRevenue / avgStockValue : 0;

    const result: InventoryAnalytics = {
      total_products: counts.total_products,
      low_stock_items: counts.low_stock_items,
      out_of_stock_items: counts.out_of_stock_items,
      total_value: counts.total_value,
      turnover_rate: Math.round(turnoverRate * 100) / 100,
      top_selling_products: topProducts
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}

/**
 * Update product consumption (manual stock adjustment)
 */
export class UpdateProductConsumptionTool extends BaseTool {
  name = 'update_product_consumption';
  description = 'Record product consumption and update stock levels';
  allowedRoles = ['client', 'admin', 'tenant_admin', 'tenant_manager'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      product_id: {
        type: 'number',
        description: 'ID of the product'
      },
      quantity: {
        type: 'number',
        description: 'Quantity consumed (positive number)'
      },
      notes: {
        type: 'string',
        description: 'Notes about the consumption (optional)'
      }
    },
    required: ['product_id', 'quantity']
  };

  protected async execute(args: any, context: AgentContext): Promise<any> {
    const { product_id, quantity, notes } = args;

    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    // Get product and validate ownership
    const product = await context.db.get(
      'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
      [product_id, context.tenantId]
    );

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.current_stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.current_stock}, Requested: ${quantity}`);
    }

    // Update stock
    const newStock = product.current_stock - quantity;
    
    await context.db.run('BEGIN TRANSACTION');
    
    try {
      // Update product stock
      await context.db.run(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStock, product_id]
      );

      // Record consumption
      await context.db.run(`
        INSERT INTO consumption_records (tenant_id, record_date, product_id, quantity, notes)
        VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)
      `, [context.tenantId, product_id, quantity, notes]);

      // Record inventory movement
      await context.db.run(`
        INSERT INTO inventory_movements (
          product_id, movement_type, quantity, unit_cost, total_value, 
          reference_type, reason, staff_member, notes
        ) VALUES (?, 'out', ?, ?, ?, 'consumption', 'Manual consumption record', ?, ?)
      `, [
        product_id, quantity, product.price, product.price * quantity,
        context.userId, notes
      ]);

      await context.db.run('COMMIT');

      const result = {
        product_name: product.name,
        quantity_consumed: quantity,
        previous_stock: product.current_stock,
        new_stock: newStock,
        reorder_needed: newStock <= product.reorder_point
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
 * Get client order analytics
 */
export class GetClientOrderAnalyticsTool extends BaseTool {
  name = 'get_client_order_analytics';
  description = 'Get analytics for customer orders including revenue, patterns, and performance';
  allowedRoles = ['client', 'admin', 'tenant_admin', 'tenant_manager'];
  
  parameters = {
    type: 'object' as const,
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date for analytics (YYYY-MM-DD)'
      },
      end_date: {
        type: 'string',
        description: 'End date for analytics (YYYY-MM-DD)'
      }
    },
    required: ['start_date', 'end_date']
  };

  protected async execute(args: any, context: AgentContext): Promise<OrderAnalytics> {
    const { start_date, end_date } = args;
    
    // Get order summary
    const summary = await context.db.get(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*) as completion_rate
      FROM client_orders 
      WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?
    `, [context.tenantId, start_date, end_date]);

    // Get peak hours
    const peakHours = await context.db.all(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as order_count
      FROM client_orders 
      WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY strftime('%H', created_at)
      ORDER BY order_count DESC
      LIMIT 5
    `, [context.tenantId, start_date, end_date]);

    const result: OrderAnalytics = {
      total_orders: summary.total_orders || 0,
      total_revenue: summary.total_revenue || 0,
      average_order_value: Math.round((summary.average_order_value || 0) * 100) / 100,
      completion_rate: Math.round((summary.completion_rate || 0) * 100) / 100,
      peak_hours: peakHours.map((h: any) => ({
        hour: parseInt(h.hour),
        order_count: h.order_count
      }))
    };

    await this.logToolUsage(context, this.name, args, result);

    return result;
  }
}