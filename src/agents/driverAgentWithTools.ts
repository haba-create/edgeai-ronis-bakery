import OpenAI from 'openai';
import { getDb } from '@/utils/db';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Define the tools/functions the driver agent can use
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_my_deliveries",
      description: "Get all deliveries assigned to the current driver with their details",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: "Filter by delivery status (optional)",
            enum: ["assigned", "pickup", "in_transit", "delivered", "failed"]
          }
        },
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "update_delivery_status",
      description: "Update the status of a delivery (e.g., mark as picked up, in transit, or delivered)",
      parameters: {
        type: "object",
        properties: {
          delivery_id: {
            type: "number",
            description: "ID of the delivery to update"
          },
          status: {
            type: "string",
            description: "New status for the delivery",
            enum: ["pickup", "in_transit", "delivered", "failed"]
          },
          notes: {
            type: "string",
            description: "Optional notes about the status update"
          }
        },
        required: ["delivery_id", "status"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_delivery_details",
      description: "Get detailed information about a specific delivery including address and customer info",
      parameters: {
        type: "object",
        properties: {
          delivery_id: {
            type: "number",
            description: "ID of the delivery to get details for"
          }
        },
        required: ["delivery_id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_driver_earnings",
      description: "Get earnings summary for the driver",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Time period for earnings",
            enum: ["today", "week", "month"]
          }
        },
        required: ["period"]
      }
    }
  }
];

// Function implementations
async function get_my_deliveries(status?: string, userId?: string) {
  try {
    const db = await getDb();
    
    // Get driver ID from user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return { error: 'User not found' };
    }
    
    // Find driver record
    const driver = await db.get(
      'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
      [user.email, user.phone]
    );
    
    if (!driver) {
      return { error: 'Driver record not found' };
    }
    
    let query = `
      SELECT 
        dt.*,
        po.id as order_id,
        po.status as order_status,
        po.expected_delivery,
        po.total_cost,
        s.name as supplier_name,
        s.address as pickup_address,
        t.name as tenant_name,
        t.address as delivery_address
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE dt.driver_id = ?
    `;
    
    const params = [driver.id];
    
    if (status) {
      query += ' AND dt.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY dt.created_at DESC';
    
    const deliveries = await db.all(query, params);
    
    // Add calculated fields
    const enrichedDeliveries = deliveries.map((d: any) => ({
      ...d,
      eta_minutes: d.estimated_arrival ? 
        Math.max(0, Math.round((new Date(d.estimated_arrival).getTime() - Date.now()) / 60000)) : null,
      earnings_estimate: 5.0 + (d.distance_km || 0) * 0.5
    }));
    
    return { 
      deliveries: enrichedDeliveries,
      total_count: enrichedDeliveries.length,
      active_count: enrichedDeliveries.filter((d: any) => ['assigned', 'pickup', 'in_transit'].includes(d.status)).length
    };
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return { error: 'Failed to fetch deliveries' };
  }
}

async function update_delivery_status(delivery_id: number, status: string, notes?: string, userId?: string) {
  try {
    const db = await getDb();
    
    // Verify driver owns this delivery
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    const driver = await db.get(
      'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
      [user?.email, user?.phone]
    );
    
    if (!driver) {
      return { error: 'Driver not found' };
    }
    
    const delivery = await db.get(
      'SELECT * FROM delivery_tracking WHERE id = ? AND driver_id = ?',
      [delivery_id, driver.id]
    );
    
    if (!delivery) {
      return { error: 'Delivery not found or not assigned to you' };
    }
    
    const timestamp = new Date().toISOString();
    
    // Update delivery status
    await db.run(`
      UPDATE delivery_tracking 
      SET status = ?, last_location_update = ?, driver_notes = ?
      WHERE id = ?
    `, [status, timestamp, notes || delivery.driver_notes, delivery_id]);
    
    // Update order status if delivered
    if (status === 'delivered' && delivery.order_id) {
      await db.run(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        ['delivered', delivery.order_id]
      );
    }
    
    return { 
      success: true, 
      delivery_id,
      new_status: status,
      updated_at: timestamp
    };
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return { error: 'Failed to update delivery status' };
  }
}

async function get_delivery_details(delivery_id: number, userId?: string) {
  try {
    const db = await getDb();
    
    // Verify driver owns this delivery
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    const driver = await db.get(
      'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
      [user?.email, user?.phone]
    );
    
    if (!driver) {
      return { error: 'Driver not found' };
    }
    
    const delivery = await db.get(`
      SELECT 
        dt.*,
        po.id as order_id,
        po.notes as order_notes,
        po.total_cost,
        s.name as supplier_name,
        s.address as pickup_address,
        s.phone as supplier_phone,
        t.name as tenant_name,
        t.address as delivery_address,
        t.phone as tenant_phone
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE dt.id = ? AND dt.driver_id = ?
    `, [delivery_id, driver.id]);
    
    if (!delivery) {
      return { error: 'Delivery not found' };
    }
    
    // Get order items if available
    let items = [];
    if (delivery.order_id) {
      items = await db.all(`
        SELECT oi.*, p.name as product_name, p.unit
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [delivery.order_id]);
    }
    
    return {
      delivery: {
        ...delivery,
        items,
        eta_minutes: delivery.estimated_arrival ? 
          Math.max(0, Math.round((new Date(delivery.estimated_arrival).getTime() - Date.now()) / 60000)) : null
      }
    };
  } catch (error) {
    console.error('Error fetching delivery details:', error);
    return { error: 'Failed to fetch delivery details' };
  }
}

async function get_driver_earnings(period: string, userId?: string) {
  try {
    const db = await getDb();
    
    // Get driver ID
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    const driver = await db.get(
      'SELECT id FROM delivery_drivers WHERE email = ? OR phone = ?',
      [user?.email, user?.phone]
    );
    
    if (!driver) {
      return { error: 'Driver not found' };
    }
    
    // Calculate date range
    const now = new Date();
    let startDate: string;
    
    switch (period) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      default:
        startDate = now.toISOString().split('T')[0];
    }
    
    // Get delivery stats
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN distance_km ELSE 0 END) as total_distance
      FROM delivery_tracking
      WHERE driver_id = ? AND DATE(created_at) >= ?
    `, [driver.id, startDate]);
    
    // Calculate earnings (simplified)
    const baseRate = 5.0;
    const perKmRate = 0.5;
    const completedDeliveries = stats.completed_deliveries || 0;
    const totalDistance = stats.total_distance || 0;
    
    const earnings = {
      period,
      start_date: startDate,
      end_date: now.toISOString().split('T')[0],
      completed_deliveries: completedDeliveries,
      total_deliveries: stats.total_deliveries || 0,
      total_distance_km: Math.round(totalDistance * 100) / 100,
      base_earnings: completedDeliveries * baseRate,
      distance_earnings: Math.round(totalDistance * perKmRate * 100) / 100,
      total_earnings: Math.round((completedDeliveries * baseRate + totalDistance * perKmRate) * 100) / 100,
      average_per_delivery: completedDeliveries > 0 ? 
        Math.round((completedDeliveries * baseRate + totalDistance * perKmRate) / completedDeliveries * 100) / 100 : 0
    };
    
    return { earnings };
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return { error: 'Failed to fetch earnings' };
  }
}

// Map function names to their implementations
const functionMap: Record<string, (...args: any[]) => Promise<any>> = {
  get_my_deliveries,
  update_delivery_status,
  get_delivery_details,
  get_driver_earnings
};

export interface DriverAgentResponse {
  message: string;
  toolCalls?: Array<{
    function: string;
    arguments: any;
    result: any;
  }>;
  error?: string;
}

/**
 * Execute Driver Agent with OpenAI function calling
 */
export async function executeDriverAgent(userMessage: string, userId: string): Promise<DriverAgentResponse> {
  if (!openai) {
    return {
      message: "OpenAI is not configured. Please provide an API key to use the AI assistant.",
      error: "No OpenAI API key"
    };
  }

  try {
    const systemPrompt = `You are an AI assistant for delivery drivers at Roni's Bagel Bakery in London. You help drivers with:

1. **Delivery Management**:
   - View assigned deliveries and their status
   - Update delivery status (pickup, in transit, delivered)
   - Get detailed information about deliveries
   - Track delivery progress and ETA

2. **Earnings Tracking**:
   - View earnings for today, this week, or this month
   - Understand earnings breakdown (base pay + distance)
   - Track completed deliveries and performance

3. **Customer Service**:
   - Provide delivery ETAs
   - Handle special delivery instructions
   - Report delivery issues

**Key Guidelines**:
- Always use the tools to get real-time data
- Be helpful and supportive to drivers
- Provide clear, actionable information
- Celebrate achievements and good performance
- Help drivers optimize their routes and earnings

**Available Functions**:
- get_my_deliveries: View all your assigned deliveries
- update_delivery_status: Update the status of a delivery
- get_delivery_details: Get detailed info about a specific delivery
- get_driver_earnings: Check your earnings for a period

Always respond with specific data from the tools rather than generic information.`;

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    let toolCalls: Array<{function: string, arguments: any, result: any}> = [];
    let maxIterations = 3;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.7,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('No response from OpenAI');
      }

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`Driver agent calling function: ${functionName} with args:`, functionArgs);
          
          if (functionMap[functionName]) {
            try {
              let result;
              
              // Add userId to all function calls
              switch (functionName) {
                case 'get_my_deliveries':
                  result = await functionMap[functionName](functionArgs.status, userId);
                  break;
                case 'update_delivery_status':
                  result = await functionMap[functionName](
                    functionArgs.delivery_id,
                    functionArgs.status,
                    functionArgs.notes,
                    userId
                  );
                  break;
                case 'get_delivery_details':
                  result = await functionMap[functionName](functionArgs.delivery_id, userId);
                  break;
                case 'get_driver_earnings':
                  result = await functionMap[functionName](functionArgs.period, userId);
                  break;
                default:
                  result = { error: 'Unknown function' };
              }
              
              toolCalls.push({
                function: functionName,
                arguments: functionArgs,
                result
              });

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
        
        continue;
      } else {
        return {
          message: message.content || "I apologize, but I couldn't generate a response.",
          toolCalls
        };
      }
    }

    return {
      message: "I encountered an issue processing your request. Please try again.",
      toolCalls,
      error: "Max iterations reached"
    };

  } catch (error) {
    console.error('Error in Driver agent:', error);
    return {
      message: "I'm sorry, I encountered an error while processing your request. Please try again.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}