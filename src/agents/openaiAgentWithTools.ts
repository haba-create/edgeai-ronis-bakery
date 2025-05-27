import OpenAI from 'openai';
import { getDb } from '@/utils/db';
import { getAllProducts, getStockAlerts, getConsumptionTrends } from '@/services/productService';
import { getAllOrders, createOrder as createOrderService, getPendingOrders, getAllSuppliers } from '@/services/orderService';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Define the tools/functions the agent can use
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_inventory_status",
      description: "Get current inventory status including stock levels, critical items, and low stock alerts",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_products",
      description: "Get detailed information about all products including current stock, reorder points, and supplier details",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_orders",
      description: "Get information about current and pending orders",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_order",
      description: "Create a new purchase order for specified products",
      parameters: {
        type: "object",
        properties: {
          supplier_id: {
            type: "number",
            description: "The supplier ID to order from"
          },
          items: {
            type: "array",
            description: "Array of items to order",
            items: {
              type: "object",
              properties: {
                product_id: { type: "number" },
                quantity: { type: "number" }
              },
              required: ["product_id", "quantity"]
            }
          },
          notes: {
            type: "string",
            description: "Optional notes for the order"
          }
        },
        required: ["supplier_id", "items"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_suppliers",
      description: "Get information about all suppliers including contact details and delivery schedules",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_delivery_status",
      description: "Get delivery tracking information for orders including driver location, estimated arrival, and current status",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "number",
            description: "Optional specific order ID to track. If not provided, returns all active deliveries"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_active_deliveries",
      description: "Get all currently active deliveries with driver locations and estimated arrival times",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

// Function implementations that use the database directly
async function get_inventory_status() {
  try {
    // Run multiple queries in parallel for dashboard data
    const [alerts, pendingOrders, trends] = await Promise.all([
      getStockAlerts(),
      getPendingOrders(),
      getConsumptionTrends()
    ]);
    
    // Optimize alerts data to reduce token usage
    const optimizedAlerts = alerts.map(alert => ({
      product_name: alert.product.name,
      current_stock: alert.product.current_stock,
      reorder_point: alert.product.reorder_point,
      unit: alert.product.unit,
      priority: alert.priority,
      supplier_name: alert.product.supplier?.name,
      recommended_quantity: alert.recommended_order_quantity,
      daily_usage: alert.product.daily_usage
    }));

    // Optimize pending orders
    const optimizedOrders = pendingOrders.map(order => ({
      id: order.id,
      supplier_name: order.supplier?.name,
      status: order.status,
      expected_delivery: order.expected_delivery,
      total_cost: order.total_cost
    }));

    // Only include trending items (skip stable ones)
    const significantTrends = trends.filter(trend => 
      Math.abs(trend.trend_percentage) > 5
    ).map(trend => ({
      product_name: trend.product_name,
      avg_consumption: trend.avg_daily_consumption,
      trend_direction: trend.trend_direction,
      trend_percentage: trend.trend_percentage
    }));
    
    // Calculate stats
    const criticalAlerts = alerts.filter(alert => alert.priority === 'high').length;
    const stockOutRisk = alerts.filter(alert => 
      alert.product.days_until_stockout < 3 && alert.product.days_until_stockout > 0
    ).length;
    
    return { 
      alerts: optimizedAlerts,
      pending_orders: optimizedOrders,
      trends: significantTrends,
      stats: {
        total_products: 59,
        critical_alerts: criticalAlerts,
        low_stock_alerts: alerts.length - criticalAlerts,
        pending_orders: pendingOrders.length,
        stockout_risk: stockOutRisk
      }
    };
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    return { error: 'Failed to fetch inventory status' };
  }
}

async function get_products() {
  try {
    const products = await getAllProducts();
    // Return only essential fields to reduce token usage
    const optimizedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      current_stock: p.current_stock,
      unit: p.unit,
      reorder_point: p.reorder_point,
      daily_usage: p.daily_usage,
      price: p.price,
      supplier_name: p.supplier?.name
    }));
    return { products: optimizedProducts };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { error: 'Failed to fetch products' };
  }
}

async function get_orders() {
  try {
    const orders = await getAllOrders();
    // Return only essential order info to reduce tokens
    const optimizedOrders = orders.map(order => ({
      id: order.id,
      order_date: order.order_date,
      supplier_name: order.supplier?.name,
      status: order.status,
      expected_delivery: order.expected_delivery,
      total_cost: order.total_cost,
      item_count: order.items?.length || 0
    }));
    return { orders: optimizedOrders };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { error: 'Failed to fetch orders' };
  }
}

async function create_order(supplier_id: number, items: Array<{product_id: number, quantity: number}>, notes?: string) {
  try {
    const order = await createOrderService(supplier_id, items, notes);
    return { success: true, order };
  } catch (error) {
    console.error('Error creating order:', error);
    return { error: 'Failed to create order' };
  }
}

async function get_suppliers() {
  try {
    const suppliers = await getAllSuppliers();
    // Return only essential supplier info to reduce tokens
    const optimizedSuppliers = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      contact: s.contact,
      phone: s.phone,
      lead_time: s.lead_time,
      delivery_schedule: s.delivery_schedule,
      minimum_order: s.minimum_order
    }));
    return { suppliers: optimizedSuppliers };
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return { error: 'Failed to fetch suppliers' };
  }
}

async function get_delivery_status(order_id?: number) {
  try {
    const db = await getDb();
    
    if (order_id) {
      // Get specific order tracking
      const tracking = await db.get(`
        SELECT 
          dt.*,
          po.id as order_id,
          po.status as order_status,
          po.expected_delivery,
          po.total_cost,
          dd.name as driver_name,
          dd.phone as driver_phone,
          dd.vehicle_registration,
          s.name as supplier_name
        FROM delivery_tracking dt
        JOIN purchase_orders po ON dt.order_id = po.id
        JOIN delivery_drivers dd ON dt.driver_id = dd.id
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.id = ?
      `, [order_id]);
      
      return tracking ? { tracking } : { error: 'No tracking found for this order' };
    } else {
      // Get all active deliveries
      const trackings = await db.all(`
        SELECT 
          dt.*,
          po.id as order_id,
          po.status as order_status,
          po.expected_delivery,
          dd.name as driver_name,
          dd.phone as driver_phone,
          s.name as supplier_name
        FROM delivery_tracking dt
        JOIN purchase_orders po ON dt.order_id = po.id
        JOIN delivery_drivers dd ON dt.driver_id = dd.id
        JOIN suppliers s ON po.supplier_id = s.id
        WHERE dt.status IN ('assigned', 'in_transit')
        ORDER BY dt.last_location_update DESC
      `);
      
      return { deliveries: trackings };
    }
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    return { error: 'Failed to fetch delivery status' };
  }
}

async function get_active_deliveries() {
  try {
    const db = await getDb();
    const deliveries = await db.all(`
      SELECT 
        dt.*,
        po.id as order_id,
        po.status as order_status,
        po.expected_delivery,
        po.total_cost,
        dd.name as driver_name,
        dd.phone as driver_phone,
        dd.vehicle_registration,
        s.name as supplier_name,
        CASE 
          WHEN dt.estimated_arrival > datetime('now') 
          THEN round((julianday(dt.estimated_arrival) - julianday('now')) * 24 * 60)
          ELSE 0
        END as eta_minutes
      FROM delivery_tracking dt
      JOIN purchase_orders po ON dt.order_id = po.id
      JOIN delivery_drivers dd ON dt.driver_id = dd.id
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE dt.status IN ('assigned', 'in_transit')
      ORDER BY dt.estimated_arrival ASC
    `);
    
    return { active_deliveries: deliveries };
  } catch (error) {
    console.error('Error fetching active deliveries:', error);
    return { error: 'Failed to fetch active deliveries' };
  }
}

// Map function names to their implementations
const functionMap: Record<string, (...args: any[]) => Promise<any>> = {
  get_inventory_status,
  get_products,
  get_orders,
  create_order,
  get_suppliers,
  get_delivery_status,
  get_active_deliveries
};

export interface AgentResponse {
  message: string;
  toolCalls?: Array<{
    function: string;
    arguments: any;
    result: any;
  }>;
  error?: string;
}

/**
 * Execute OpenAI agent with function calling capabilities
 */
export async function executeOpenAIAgent(userMessage: string): Promise<AgentResponse> {
  if (!openai) {
    return {
      message: "OpenAI is not configured. Please provide an API key to use the AI assistant.",
      error: "No OpenAI API key"
    };
  }

  try {
    const systemPrompt = `You are an AI assistant for Roni's Bagel Bakery in Belsize Park, London. You help with inventory management, ordering, and delivery tracking.

Your role:
1. Analyze inventory and identify critical/low stock items
2. Provide ordering recommendations based on consumption
3. Create purchase orders when requested
4. Answer questions about products, suppliers, and orders
5. Track delivery status and provide real-time updates on shipments
6. Monitor driver locations and estimated arrival times

Available functions for delivery tracking:
- get_delivery_status: Get tracking info for specific orders or all active deliveries
- get_active_deliveries: Get all currently active deliveries with ETA

Always use tools to get real-time data. Be specific and actionable.

For delivery queries, provide:
- Current driver location and status
- Estimated arrival time
- Delivery progress updates
- Contact information when needed

Ordering priorities: critical items (≤50% reorder point), consider lead times, factor daily usage.`;

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    let toolCalls: Array<{function: string, arguments: any, result: any}> = [];
    let maxIterations = 3; // Prevent infinite loops
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 1000,
        temperature: 0.7,
        stream: false, // Explicitly disable streaming for function calls
        parallel_tool_calls: true, // Enable parallel function calls for better performance
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('No response from OpenAI');
      }

      // Add assistant message to conversation
      messages.push(message);

      // Check if the model wants to call functions
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute each function call
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`Calling function: ${functionName} with args:`, functionArgs);
          
          if (functionMap[functionName]) {
            try {
              let result;
              if (functionName === 'create_order') {
                result = await functionMap[functionName](
                  functionArgs.supplier_id,
                  functionArgs.items,
                  functionArgs.notes
                );
              } else {
                result = await functionMap[functionName]();
              }
              
              toolCalls.push({
                function: functionName,
                arguments: functionArgs,
                result
              });

              // Add function result to conversation
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });
            } catch (error) {
              console.error(`Error executing function ${functionName}:`, error);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: `Failed to execute ${functionName}` })
              });
            }
          }
        }
        
        // Continue the conversation to get the final response
        continue;
      } else {
        // No more function calls, return the final response
        return {
          message: message.content || "I apologize, but I couldn't generate a response.",
          toolCalls
        };
      }
    }

    return {
      message: "I encountered an issue processing your request. Please try again with a simpler query.",
      toolCalls,
      error: "Max iterations reached"
    };

  } catch (error) {
    console.error('Error in OpenAI agent:', error);
    return {
      message: "I'm sorry, I encountered an error while processing your request. Please try again.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}