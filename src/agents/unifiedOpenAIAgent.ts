import OpenAI from 'openai';
import { getDb } from '@/utils/db';
import { customerTools, executeCustomerTool } from './tools/customer-tools';
import { ownerTools, executeOwnerTool } from './tools/owner-tools';
import { adminTools, executeAdminTool } from './tools/admin-unified-tools';
import { logger } from '@/utils/logger';
import { createTracedAgent } from '@/utils/langsmith';

// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? 
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }) : null;

interface AgentResponse {
  response: string;
  toolCalls?: Array<{
    name: string;
    result: any;
  }>;
  fallbackMode?: boolean;
  metadata?: {
    role: string;
    userId: string;
    executedTools: number;
    fallbackMode?: boolean;
  };
}

// Database tool functions for all roles
const toolFunctions = {
  // DRIVER TOOLS
  get_my_deliveries: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { status } = args;
    
    // Handle both database users and mock auth users
    let driverEmail = 'driver@edgeai.com'; // Default for mock auth
    
    // For mock auth system, user ID '4' is always the driver
    if (context.userId === '4') {
      driverEmail = 'driver@edgeai.com';
    } else {
      // Try to get user from database for real users
      const user = await context.db.get('SELECT * FROM users WHERE id = ?', [context.userId]);
      if (user && user.email && user.role === 'driver') {
        driverEmail = user.email;
      } else if (user && user.role !== 'driver') {
        throw new Error('User is not a driver');
      }
    }
    
    console.log('Looking for driver with email:', driverEmail, 'userId:', context.userId);
    
    const driver = await context.db.get(
      'SELECT * FROM delivery_drivers WHERE email = ?',
      [driverEmail]
    );
    
    if (!driver) {
      console.log('Available drivers:', await context.db.all('SELECT email, name FROM delivery_drivers'));
      throw new Error(`Driver record not found for email: ${driverEmail}`);
    }
    
    let query = `
      SELECT 
        dt.*,
        po.total_cost as order_value,
        po.status as order_status,
        t.name as tenant_name,
        t.address as delivery_address
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE dt.driver_id = ?
    `;
    const params = [driver.id];
    
    if (status) {
      query += ' AND dt.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY dt.created_at DESC';
    
    const deliveries = await context.db.all(query, params);
    
    return {
      deliveries: deliveries.map((d: any) => ({
        id: d.id,
        status: d.status,
        tenant_name: d.tenant_name,
        delivery_address: d.delivery_address,
        order_value: d.order_value,
        estimated_arrival: d.estimated_arrival,
        estimated_earnings: 5.0 + (d.order_value * 0.1) // Base + 10% of order value
      })),
      total_count: deliveries.length,
      active_count: deliveries.filter((d: any) => ['assigned', 'pickup', 'in_transit'].includes(d.status)).length
    };
  },

  update_delivery_status: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { delivery_id, status, notes } = args;
    
    // Handle both database users and mock auth users
    let driverEmail = 'driver@edgeai.com';
    if (context.userId === '4') {
      driverEmail = 'driver@edgeai.com';
    } else {
      const user = await context.db.get('SELECT * FROM users WHERE id = ?', [context.userId]);
      if (user && user.email && user.role === 'driver') {
        driverEmail = user.email;
      }
    }
    
    const driver = await context.db.get(
      'SELECT * FROM delivery_drivers WHERE email = ?',
      [driverEmail]
    );
    
    if (!driver) throw new Error('Driver record not found');
    
    // Verify delivery belongs to driver
    const delivery = await context.db.get(
      'SELECT * FROM delivery_tracking WHERE id = ? AND driver_id = ?',
      [delivery_id, driver.id]
    );
    
    if (!delivery) throw new Error('Delivery not found or not assigned to you');
    
    const currentTime = new Date().toISOString();
    
    await context.db.run(`
      UPDATE delivery_tracking 
      SET status = ?, delivery_notes = ?, last_location_update = ?, updated_at = ?
      WHERE id = ?
    `, [status, notes, currentTime, currentTime, delivery_id]);
    
    return {
      delivery_id,
      new_status: status,
      updated_at: currentTime,
      message: `Delivery ${delivery_id} status updated to ${status}`
    };
  },

  get_driver_earnings: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { period = 'today' } = args;
    
    // Handle both database users and mock auth users
    let driverEmail = 'driver@edgeai.com';
    if (context.userId === '4') {
      driverEmail = 'driver@edgeai.com';
    } else {
      const user = await context.db.get('SELECT * FROM users WHERE id = ?', [context.userId]);
      if (user && user.email && user.role === 'driver') {
        driverEmail = user.email;
      }
    }
    
    const driver = await context.db.get(
      'SELECT * FROM delivery_drivers WHERE email = ?',
      [driverEmail]
    );
    
    if (!driver) throw new Error('Driver record not found');
    
    let dateFilter = '';
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter = `DATE(dt.created_at) = DATE('now')`;
        break;
      case 'week':
        dateFilter = `dt.created_at >= DATE('now', '-7 days')`;
        break;
      case 'month':
        dateFilter = `dt.created_at >= DATE('now', '-30 days')`;
        break;
    }
    
    const earnings = await context.db.get(`
      SELECT 
        COUNT(CASE WHEN dt.status = 'delivered' THEN 1 END) as completed_deliveries,
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN dt.status = 'delivered' THEN po.total_cost * 0.1 + 5.0 ELSE 0 END) as total_earnings
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      WHERE dt.driver_id = ? AND ${dateFilter}
    `, [driver.id]);
    
    return {
      period,
      completed_deliveries: earnings.completed_deliveries || 0,
      total_deliveries: earnings.total_deliveries || 0,
      total_earnings: Number(earnings.total_earnings || 0).toFixed(2),
      earnings_per_delivery: earnings.completed_deliveries > 0 
        ? (earnings.total_earnings / earnings.completed_deliveries).toFixed(2) 
        : '0.00'
    };
  },

  // ADMIN TOOLS
  get_all_orders: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { status, limit = 50 } = args;
    
    let query = `
      SELECT 
        po.*,
        t.name as tenant_name,
        s.name as supplier_name,
        dt.status as delivery_status,
        dt.driver_id
      FROM purchase_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN delivery_tracking dt ON po.id = dt.order_id
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE po.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY po.created_at DESC LIMIT ?';
    params.push(limit);
    
    const orders = await context.db.all(query, params);
    return { orders, count: orders.length };
  },

  assign_delivery: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { order_id, driver_id } = args;
    
    // Check if delivery tracking already exists
    const existing = await context.db.get(
      'SELECT id FROM delivery_tracking WHERE order_id = ?',
      [order_id]
    );
    
    if (existing) {
      await context.db.run(
        'UPDATE delivery_tracking SET driver_id = ?, status = "assigned", updated_at = ? WHERE order_id = ?',
        [driver_id, new Date().toISOString(), order_id]
      );
    } else {
      await context.db.run(`
        INSERT INTO delivery_tracking (order_id, driver_id, status, estimated_arrival, created_at)
        VALUES (?, ?, 'assigned', datetime('now', '+2 hours'), datetime('now'))
      `, [order_id, driver_id]);
    }
    
    return {
      order_id,
      driver_id,
      status: 'assigned',
      message: `Order ${order_id} assigned to driver ${driver_id}`
    };
  },

  // SUPPLIER TOOLS
  get_my_orders: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { status } = args;
    
    const user = await context.db.get('SELECT * FROM users WHERE id = ?', [context.userId]);
    
    let query = `
      SELECT 
        po.*,
        t.name as tenant_name,
        dt.status as delivery_status
      FROM purchase_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      LEFT JOIN delivery_tracking dt ON po.id = dt.order_id
      WHERE po.supplier_id IN (SELECT id FROM suppliers WHERE email = ?)
    `;
    const params = [user.email];
    
    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY po.created_at DESC';
    
    const orders = await context.db.all(query, params);
    return { orders, count: orders.length };
  },

  update_order_status: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { order_id, status, notes } = args;
    
    await context.db.run(`
      UPDATE purchase_orders 
      SET status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `, [status, notes, new Date().toISOString(), order_id]);
    
    return {
      order_id,
      new_status: status,
      message: `Order ${order_id} status updated to ${status}`
    };
  },

  // CLIENT TOOLS
  get_inventory: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const user = await context.db.get('SELECT * FROM users WHERE id = ?', [context.userId]);
    
    const inventory = await context.db.all(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.category,
        p.unit_price
      FROM product_inventory pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.tenant_id = ?
      ORDER BY pi.last_updated DESC
    `, [user.tenant_id]);
    
    return { inventory, count: inventory.length };
  },

  place_order: async (args: any, context: { userId: string; userRole: string; db: any }) => {
    const { supplier_id, items, notes } = args;
    
    const user = await context.db.get('SELECT * FROM users WHERE id = ?', [context.userId]);
    
    // Calculate total cost
    const total_cost = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    
    const result = await context.db.run(`
      INSERT INTO purchase_orders (tenant_id, supplier_id, order_date, status, total_cost, notes)
      VALUES (?, ?, date('now'), 'pending', ?, ?)
    `, [user.tenant_id, supplier_id, total_cost, notes]);
    
    return {
      order_id: result.lastID,
      total_cost,
      status: 'pending',
      message: `Order placed successfully with ID ${result.lastID}`
    };
  }
};

// Tool definitions for OpenAI
const getToolsForRole = (role: string) => {
  // Include role-specific tools
  let roleTools: any[] = [];
  
  if (role === 'customer') {
    roleTools = customerTools.map(tool => ({
      type: "function" as const,
      function: tool
    }));
  } else if (role === 'admin') {
    roleTools = adminTools.map(tool => ({
      type: "function" as const,
      function: tool
    }));
  } else if (role === 'owner' || role === 'client') {
    roleTools = ownerTools.map(tool => ({
      type: "function" as const,
      function: tool
    }));
  }
  
  const allTools = [
    // Driver tools
    {
      role: 'driver',
      tool: {
        type: "function" as const,
        function: {
          name: "get_my_deliveries",
          description: "Get all deliveries assigned to the current driver",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                description: "Filter by delivery status (optional)",
                enum: ["assigned", "pickup", "in_transit", "delivered", "failed"]
              }
            }
          }
        }
      }
    },
    {
      role: 'driver',
      tool: {
        type: "function" as const,
        function: {
          name: "update_delivery_status",
          description: "Update the status of a delivery",
          parameters: {
            type: "object",
            properties: {
              delivery_id: { type: "number", description: "ID of the delivery to update" },
              status: { 
                type: "string", 
                description: "New status for the delivery",
                enum: ["assigned", "pickup", "in_transit", "delivered", "failed"]
              },
              notes: { type: "string", description: "Optional notes about the status update" }
            },
            required: ["delivery_id", "status"]
          }
        }
      }
    },
    {
      role: 'driver',
      tool: {
        type: "function" as const,
        function: {
          name: "get_driver_earnings",
          description: "Get earnings summary for the current driver",
          parameters: {
            type: "object",
            properties: {
              period: {
                type: "string",
                description: "Time period for earnings",
                enum: ["today", "week", "month"]
              }
            }
          }
        }
      }
    },
    // Admin tools
    {
      role: 'admin',
      tool: {
        type: "function" as const,
        function: {
          name: "get_all_orders",
          description: "Get all orders across all tenants",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filter by order status" },
              limit: { type: "number", description: "Maximum number of orders to return" }
            }
          }
        }
      }
    },
    {
      role: 'admin',
      tool: {
        type: "function" as const,
        function: {
          name: "assign_delivery",
          description: "Assign a delivery to a driver",
          parameters: {
            type: "object",
            properties: {
              order_id: { type: "number", description: "ID of the order to assign" },
              driver_id: { type: "number", description: "ID of the driver to assign to" }
            },
            required: ["order_id", "driver_id"]
          }
        }
      }
    },
    // Supplier tools
    {
      role: 'supplier',
      tool: {
        type: "function" as const,
        function: {
          name: "get_my_orders",
          description: "Get orders for the current supplier",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filter by order status" }
            }
          }
        }
      }
    },
    {
      role: 'supplier',
      tool: {
        type: "function" as const,
        function: {
          name: "update_order_status",
          description: "Update the status of an order",
          parameters: {
            type: "object",
            properties: {
              order_id: { type: "number", description: "ID of the order to update" },
              status: { type: "string", description: "New status for the order" },
              notes: { type: "string", description: "Optional notes about the update" }
            },
            required: ["order_id", "status"]
          }
        }
      }
    },
    // Client tools
    {
      role: 'client',
      tool: {
        type: "function" as const,
        function: {
          name: "get_inventory",
          description: "Get current inventory for the client's business",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      }
    },
    {
      role: 'client',
      tool: {
        type: "function" as const,
        function: {
          name: "place_order",
          description: "Place a new order with a supplier",
          parameters: {
            type: "object",
            properties: {
              supplier_id: { type: "number", description: "ID of the supplier" },
              items: {
                type: "array",
                description: "List of items to order",
                items: {
                  type: "object",
                  properties: {
                    product_id: { type: "number" },
                    quantity: { type: "number" },
                    unit_price: { type: "number" }
                  }
                }
              },
              notes: { type: "string", description: "Special instructions or notes" }
            },
            required: ["supplier_id", "items"]
          }
        }
      }
    }
  ];

  const legacyTools = allTools.filter(t => t.role === role || t.role === 'admin').map(t => t.tool);
  
  return [...roleTools, ...legacyTools];
};

async function _executeUnifiedAgent(
  input: string,
  userId: string,
  userRole: string
): Promise<AgentResponse> {
  const requestId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logContext = { requestId, userId, userRole, inputLength: input.length };
  
  logger.info('Unified agent execution started', logContext);
  
  try {
    const db = await getDb();
    const context = { userId, userRole, db };

    logger.debug('Database connection established', logContext);

    let result: AgentResponse;
    
    // If OpenAI is available, use it for intelligent tool calling
    if (openai) {
      logger.info('Using OpenAI for agent execution', logContext);
      result = await executeWithOpenAI(input, userId, userRole, context, requestId);
    } else {
      logger.warn('OpenAI not available, using fallback mode', logContext);
      // Fallback to simple keyword-based tool execution
      result = await executeWithFallback(input, userId, userRole, context);
    }
    
    return result;
  } catch (error) {
    logger.error('Unified agent execution failed', logContext, error as Error);
    
    return {
      response: "I encountered an error while processing your request. Please try again or contact support if the issue persists.",
      fallbackMode: true,
      metadata: {
        role: userRole,
        userId,
        executedTools: 0,
        fallbackMode: true
      }
    };
  }
}

async function executeWithOpenAI(
  input: string,
  userId: string,
  userRole: string,
  context: { userId: string; userRole: string; db: any },
  requestId: string
): Promise<AgentResponse> {
  // Get role-specific tools
  const tools = getToolsForRole(userRole);
  
  // Create system prompt based on role
  const systemPrompts = {
    driver: "You are an AI assistant for delivery drivers at Roni's Bagel Bakery. Help with delivery management, navigation, and earnings tracking. Use the available tools to provide accurate, real-time information.",
    admin: "You are an AI assistant for system administrators managing the Roni's Bagel Bakery platform. Help with system monitoring, tenant management, user administration, system analytics, and platform operations. Use the available tools to monitor system health, manage tenants, analyze platform usage, and maintain the multi-tenant system.",
    owner: "You are an AI assistant for business owners and administrators at Roni's Bagel Bakery. Help with business analytics, inventory optimization, supplier management, and operational insights. Use the available tools to analyze performance and make data-driven decisions.",
    supplier: "You are an AI assistant for suppliers to Roni's Bagel Bakery. Help with order management, inventory coordination, and delivery tracking. Use the available tools to manage your orders.",
    client: "You are an AI assistant for business owners at Roni's Bagel Bakery. Help with business analytics, inventory optimization, supplier management, and operational insights. Use the available tools to analyze performance and make data-driven decisions.",
    customer: "You are a friendly shopping assistant for customers at Roni's Bagel Bakery. Help customers find products, make recommendations, check availability, and provide information about our fresh kosher products. Use the available tools to search products and provide personalized recommendations."
  };

  const systemPrompt = systemPrompts[userRole as keyof typeof systemPrompts] || systemPrompts.client;

  // Initial conversation
  let messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input }
  ];

  let executedTools: Array<{ name: string; result: any }> = [];
  let maxIterations = 3;
  let iteration = 0;

  while (iteration < maxIterations) {
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_completion_tokens: 1000,
    });

    const message = completion.choices[0]?.message;
    if (!message) break;

    messages.push(message);

    // Check if the model wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        // Try legacy tools first
        if (toolFunctions[functionName as keyof typeof toolFunctions]) {
          const toolStart = Date.now();
          try {
            logger.toolExecution(functionName, functionArgs, { requestId, userId, userRole });
            
            const result = await toolFunctions[functionName as keyof typeof toolFunctions](functionArgs, context);
            
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, true, JSON.stringify(result).length, toolDuration, { requestId, userId, userRole });
            
            
            executedTools.push({ name: functionName, result });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, false, 0, toolDuration, { requestId, userId, userRole });
            logger.error(`Tool execution failed: ${functionName}`, { requestId, userId, userRole }, error as Error);
            
            
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: (error as Error).message })
            });
          }
        }
        // Try customer tools
        else if (userRole === 'customer' && customerTools.some(t => t.name === functionName)) {
          const toolStart = Date.now();
          try {
            logger.toolExecution(functionName, functionArgs, { requestId, userId, userRole });
            
            const result = await executeCustomerTool(functionName, functionArgs, context);
            
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, true, JSON.stringify(result).length, toolDuration, { requestId, userId, userRole });
            
            
            executedTools.push({ name: functionName, result });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, false, 0, toolDuration, { requestId, userId, userRole });
            logger.error(`Customer tool execution failed: ${functionName}`, { requestId, userId, userRole }, error as Error);
            
            
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: (error as Error).message })
            });
          }
        }
        // Try admin tools
        else if (userRole === 'admin' && adminTools.some(t => t.name === functionName)) {
          const toolStart = Date.now();
          try {
            logger.toolExecution(functionName, functionArgs, { requestId, userId, userRole });
            
            const result = await executeAdminTool(functionName, functionArgs, context);
            
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, true, JSON.stringify(result).length, toolDuration, { requestId, userId, userRole });
            
            executedTools.push({ name: functionName, result });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, false, 0, toolDuration, { requestId, userId, userRole });
            logger.error(`Admin tool execution failed: ${functionName}`, { requestId, userId, userRole }, error as Error);
            
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: (error as Error).message })
            });
          }
        }
        // Try owner tools
        else if ((userRole === 'owner' || userRole === 'client') && ownerTools.some(t => t.name === functionName)) {
          const toolStart = Date.now();
          try {
            logger.toolExecution(functionName, functionArgs, { requestId, userId, userRole });
            
            const result = await executeOwnerTool(functionName, functionArgs, context);
            
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, true, JSON.stringify(result).length, toolDuration, { requestId, userId, userRole });
            
            
            executedTools.push({ name: functionName, result });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            const toolDuration = Date.now() - toolStart;
            logger.toolResult(functionName, false, 0, toolDuration, { requestId, userId, userRole });
            logger.error(`Owner tool execution failed: ${functionName}`, { requestId, userId, userRole }, error as Error);
            
            
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: (error as Error).message })
            });
          }
        }
      }
      iteration++;
    } else {
      // No more tool calls, we have the final response
      break;
    }
  }

  // Get the final response
  const finalMessage = messages[messages.length - 1];
  const response = finalMessage.role === 'assistant' ? finalMessage.content : "I apologize, but I couldn't process your request properly.";

  return {
    response: response || "I'm ready to help! What would you like to know?",
    toolCalls: executedTools,
    metadata: {
      role: userRole,
      userId,
      executedTools: executedTools.length
    }
  };
}

async function executeWithFallback(
  input: string,
  userId: string,
  userRole: string,
  context: { userId: string; userRole: string; db: any }
): Promise<AgentResponse> {
  const lowerInput = input.toLowerCase();
  let executedTools: Array<{ name: string; result: any }> = [];
  let response = "";

  // Simple keyword-based tool execution for testing
  if (userRole === 'driver') {
    if (lowerInput.includes('deliver') || lowerInput.includes('how many')) {
      try {
        const result = await toolFunctions.get_my_deliveries({}, context);
        executedTools.push({ name: 'get_my_deliveries', result });
        
        if (result.deliveries && result.deliveries.length > 0) {
          response = `📋 **Your Delivery Schedule:**\n\n`;
          response += `You have ${result.active_count} active deliveries:\n\n`;
          
          result.deliveries
            .filter((d: any) => ['assigned', 'pickup', 'in_transit'].includes(d.status))
            .forEach((delivery: any, idx: number) => {
              response += `${idx + 1}. 📦 **${delivery.tenant_name || 'Customer'}**\n`;
              response += `   📍 ${delivery.delivery_address}\n`;
              response += `   💰 Est. earnings: £${delivery.estimated_earnings}\n`;
              response += `   📋 Status: ${delivery.status}\n\n`;
            });
        } else {
          response = `You currently have ${result.active_count} active deliveries.`;
        }
      } catch (error) {
        response = `Error retrieving deliveries: ${(error as Error).message}`;
      }
    } else if (lowerInput.includes('earning')) {
      try {
        const result = await toolFunctions.get_driver_earnings({ period: 'today' }, context);
        executedTools.push({ name: 'get_driver_earnings', result });
        
        response = `💰 **Today's Earnings:**\n\n`;
        response += `• Completed deliveries: ${result.completed_deliveries}\n`;
        response += `• Total earnings: £${result.total_earnings}\n`;
        response += `• Earnings per delivery: £${result.earnings_per_delivery}`;
      } catch (error) {
        response = `Error retrieving earnings: ${(error as Error).message}`;
      }
    } else {
      response = "Hi! I'm your delivery assistant. I can help you with:\n\n• Check your delivery schedule\n• View earnings\n• Update delivery status\n\nWhat would you like to know?";
    }
  } else {
    response = `I'm ready to help with ${userRole} tasks! What would you like to do?`;
  }

  return {
    response,
    toolCalls: executedTools,
    metadata: {
      role: userRole,
      userId,
      executedTools: executedTools.length,
      fallbackMode: true
    }
  };
}

// Export the traced version of the agent
export const executeUnifiedAgent = createTracedAgent(_executeUnifiedAgent);