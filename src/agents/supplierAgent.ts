import OpenAI from 'openai';
import { getDb } from '@/utils/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SupplierContext {
  supplierId: number;
  supplierName: string;
}

// Function to get orders for a supplier
async function getSupplierOrders(supplierId: number) {
  try {
    const db = await getDb();
    const orders = await db.all(`
      SELECT 
        po.*,
        s.name as supplier_name,
        COUNT(oi.id) as item_count,
        GROUP_CONCAT(p.name || ' (' || oi.quantity || ')') as items_summary
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN order_items oi ON po.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE po.supplier_id = ?
      GROUP BY po.id
      ORDER BY po.order_date DESC
    `, [supplierId]);
    
    return orders;
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    return [];
  }
}

// Function to get delivery tracking for an order
async function getDeliveryTracking(orderId: number) {
  try {
    const db = await getDb();
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
    `, [orderId]);
    
    return tracking;
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    return null;
  }
}

// Function to get all drivers for a supplier
async function getSupplierDrivers(supplierId: number) {
  try {
    const db = await getDb();
    const drivers = await db.all(`
      SELECT 
        dd.*,
        s.name as supplier_name,
        COUNT(dt.id) as active_deliveries
      FROM delivery_drivers dd
      LEFT JOIN suppliers s ON dd.supplier_id = s.id
      LEFT JOIN delivery_tracking dt ON dd.id = dt.driver_id AND dt.status IN ('assigned', 'in_transit')
      WHERE dd.supplier_id = ?
      GROUP BY dd.id 
      ORDER BY dd.name
    `, [supplierId]);
    
    return drivers;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }
}

// Function to update order status
async function updateOrderStatus(orderId: number, supplierId: number, status: string, notes?: string) {
  try {
    const db = await getDb();
    const result = await db.run(
      'UPDATE purchase_orders SET status = ?, notes = ? WHERE id = ? AND supplier_id = ?',
      [status, notes || '', orderId, supplierId]
    );
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

const supplierTools = [
  {
    type: "function" as const,
    function: {
      name: 'get_supplier_orders',
      description: 'Get all orders for the current supplier, including pending, confirmed, and delivered orders',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: 'get_delivery_tracking',
      description: 'Get delivery tracking information for a specific order including driver location, status, and estimated arrival',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'number',
            description: 'The order ID to track'
          }
        },
        required: ['order_id']
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: 'get_supplier_drivers',
      description: 'Get all drivers assigned to the current supplier with their current status and active deliveries',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: 'update_order_status',
      description: 'Update the status of an order (e.g., confirmed, shipped, delivered) with optional notes',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'number',
            description: 'The order ID to update'
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
            description: 'New status for the order'
          },
          notes: {
            type: 'string',
            description: 'Optional notes about the status update'
          }
        },
        required: ['order_id', 'status']
      }
    }
  }
];

export async function processSupplierMessage(
  message: string,
  context: SupplierContext,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    const systemPrompt = `You are a helpful AI assistant for ${context.supplierName}, a supplier in the Roni's Bakery ordering system. 

Your role is to help with:
- Managing and viewing orders from Roni's Bakery
- Tracking delivery status and driver locations
- Updating order statuses (pending → confirmed → shipped → delivered)
- Managing delivery drivers and schedules
- Providing delivery tracking information

You have access to real-time data about orders, deliveries, and drivers. Be helpful, professional, and provide accurate information based on the available functions.

Current supplier: ${context.supplierName} (ID: ${context.supplierId})

Always use the available functions to get current data rather than making assumptions. Provide clear, actionable information.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: supplierTools,
      tool_choice: 'auto',
      max_tokens: 1000,
      temperature: 0.7,
      parallel_tool_calls: true
    });

    const responseMessage = response.choices[0].message;

    // Handle tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

      let functionResult;
      switch (functionName) {
        case 'get_supplier_orders':
          functionResult = await getSupplierOrders(context.supplierId);
          break;
        case 'get_delivery_tracking':
          functionResult = await getDeliveryTracking(functionArgs.order_id);
          break;
        case 'get_supplier_drivers':
          functionResult = await getSupplierDrivers(context.supplierId);
          break;
        case 'update_order_status':
          functionResult = await updateOrderStatus(
            functionArgs.order_id,
            context.supplierId,
            functionArgs.status,
            functionArgs.notes
          );
          break;
        default:
          functionResult = { error: 'Unknown function' };
      }

      // Get the final response with tool result
      const followUpResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          ...messages,
          responseMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return followUpResponse.choices[0].message.content || 'I apologize, but I encountered an issue processing your request.';
    }

    return responseMessage.content || 'I apologize, but I encountered an issue processing your request.';
  } catch (error) {
    console.error('Error in supplier agent:', error);
    return 'I apologize, but I encountered an issue processing your request. Please try again.';
  }
}