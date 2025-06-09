import OpenAI from 'openai';
import { getDb } from '@/utils/db';
import { AgentContext } from './types';
import { 
  GetMyDeliveriesTool, 
  UpdateLocationTool, 
  GetNavigationRouteTool, 
  CompleteDeliveryTool, 
  GetDriverEarningsTool 
} from './tools/driver-tools';

// Initialize OpenAI client
const openai = (process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
  process.env.OPENAI_API_KEY !== 'your_ope' + 'nai_api_key_here') ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface DriverAgentResult {
  response: string;
  suggestedActions?: Array<{
    type: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Driver Agent - Specialized assistant for delivery drivers
 * Helps with navigation, delivery management, earnings tracking, and route optimization
 */
export async function executeDriverAgent(
  input: string, 
  userId: string, 
  userRole: string = 'driver'
): Promise<DriverAgentResult> {
  console.log('Executing driver agent for user:', userId, 'with input:', input);
  
  try {
    const db = await getDb();
    
    // Get user info to determine tenantId and convert userId to number
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }
    
    const context: AgentContext = {
      db,
      userId: parseInt(userId),
      userRole: userRole as any,
      tenantId: user.tenant_id || 1
    };

    // Initialize available tools
    const tools = [
      new GetMyDeliveriesTool(),
      new UpdateLocationTool(),
      new GetNavigationRouteTool(),
      new CompleteDeliveryTool(),
      new GetDriverEarningsTool()
    ];

    // Get current driver context
    const driverContext = await getDriverContext(context);
    
    // Use OpenAI for intelligent response if available, otherwise use local logic with tools
    if (openai) {
      try {
        return await getOpenAIDriverResponse(input, driverContext, tools, context);
      } catch (error) {
        console.log('OpenAI error, falling back to local logic:', error);
        return await getLocalDriverResponse(input, driverContext, tools, context);
      }
    } else {
      console.log('OpenAI API key not configured, using local driver logic with database tools');
      return await getLocalDriverResponse(input, driverContext, tools, context);
    }
  } catch (error) {
    console.error('Error in driver agent execution:', error);
    return {
      response: "I encountered an error while processing your request. Please try again or contact support if the issue persists.",
    };
  }
}

/**
 * Get current driver context including active deliveries and status
 */
async function getDriverContext(context: AgentContext) {
  try {
    // Get driver record
    const user = await context.db.get(
      'SELECT * FROM users WHERE id = ?',
      [context.userId]
    );

    const driverRecord = await context.db.get(
      'SELECT * FROM delivery_drivers WHERE email = ? OR phone = ?',
      [user?.email, user?.phone]
    );

    if (!driverRecord) {
      throw new Error('Driver record not found');
    }

    // Get active deliveries
    const activeDeliveries = await context.db.all(`
      SELECT 
        dt.*,
        po.total_cost as order_value,
        t.name as tenant_name,
        t.address as delivery_address
      FROM delivery_tracking dt
      LEFT JOIN purchase_orders po ON dt.order_id = po.id
      LEFT JOIN tenants t ON po.tenant_id = t.id
      WHERE dt.driver_id = ? AND dt.status IN ('assigned', 'pickup', 'in_transit')
      ORDER BY dt.estimated_arrival ASC
    `, [driverRecord.id]);

    // Get today's completed deliveries for earnings
    const today = new Date().toISOString().split('T')[0];
    const todayCompletedDeliveries = await context.db.all(`
      SELECT COUNT(*) as count
      FROM delivery_tracking 
      WHERE driver_id = ? AND status = 'delivered' AND DATE(actual_arrival) = ?
    `, [driverRecord.id, today]);

    return {
      driver: driverRecord,
      activeDeliveries,
      todayStats: todayCompletedDeliveries[0] || { count: 0 },
      currentLocation: {
        latitude: driverRecord.current_latitude || 51.5574,
        longitude: driverRecord.current_longitude || -0.1469
      }
    };
  } catch (error) {
    console.error('Error getting driver context:', error);
    return {
      driver: null,
      activeDeliveries: [],
      todayStats: { count: 0 },
      currentLocation: null
    };
  }
}

/**
 * Use OpenAI for intelligent driver assistance
 */
async function getOpenAIDriverResponse(
  input: string, 
  driverContext: any, 
  tools: any[], 
  context: AgentContext
): Promise<DriverAgentResult> {
  const systemPrompt = `You are an AI assistant for delivery drivers at Roni's Bagel Bakery in London. You help drivers with:
1. Navigation and route optimization
2. Delivery status updates and completion
3. Earnings tracking and performance insights
4. Problem-solving during deliveries
5. Communication with customers and dispatch

Current driver status:
- Driver: ${driverContext.driver?.name || 'Unknown'}
- Active deliveries: ${driverContext.activeDeliveries.length}
- Today's completed deliveries: ${driverContext.todayStats.count}
- Today's completed deliveries: ${driverContext.todayStats.count || 0}

Active deliveries:
${driverContext.activeDeliveries.map((delivery: any, idx: number) => 
  `${idx + 1}. ${delivery.tenant_name || 'Unknown customer'} - ${delivery.street_address || delivery.delivery_address} (Status: ${delivery.status}, ETA: ${delivery.estimated_arrival})`
).join('\n')}

Available tools:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Be helpful, practical, and focused on driver efficiency and customer satisfaction. If the driver needs specific actions (like updating location, completing delivery, or getting navigation), suggest using the appropriate tools.`;

  // Determine if we need to use tools based on the input
  const lowerInput = input.toLowerCase();
  let toolResponse = null;

  try {
    // Check if input suggests using specific tools
    if (lowerInput.includes('delivery') || lowerInput.includes('deliveries')) {
      const deliveriesTool = tools.find(t => t.name === 'get_my_deliveries');
      if (deliveriesTool) {
        const result = await deliveriesTool.function({}, context);
        toolResponse = result.success ? result.data : null;
      }
    } else if (lowerInput.includes('earning') || lowerInput.includes('money') || lowerInput.includes('pay')) {
      const earningsTool = tools.find(t => t.name === 'get_driver_earnings');
      if (earningsTool) {
        const result = await earningsTool.function({ period: 'today' }, context);
        toolResponse = result.success ? result.data : null;
      }
    } else if (lowerInput.includes('complete') || lowerInput.includes('finish') || lowerInput.includes('delivered')) {
      // For completion, we'd need specific delivery ID from user
      const matches = input.match(/delivery.?(\d+)|order.?(\d+)/i);
      if (matches && driverContext.activeDeliveries.length > 0) {
        const deliveryId = parseInt(matches[1] || matches[2]);
        const delivery = driverContext.activeDeliveries.find((d: any) => d.id === deliveryId);
        if (delivery) {
          // This would need current location - simplified for demo
          const completionTool = tools.find(t => t.name === 'complete_delivery');
          if (completionTool && driverContext.currentLocation) {
            const result = await completionTool.function({
              delivery_id: deliveryId,
              completion_location: driverContext.currentLocation
            }, context);
            toolResponse = result.success ? result.data : null;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error executing tool:', error);
  }

  const completion = await openai!.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${input}${toolResponse ? `\n\nTool result: ${JSON.stringify(toolResponse, null, 2)}` : ''}` }
    ],
    max_tokens: 800,
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

  // Generate suggested actions based on context
  const suggestedActions = generateDriverSuggestedActions(driverContext, input);

  return {
    response,
    suggestedActions,
    metadata: {
      aiProvider: 'openai',
      activeDeliveries: driverContext.activeDeliveries.length,
      todayDeliveries: driverContext.todayStats.count,
      toolUsed: toolResponse ? 'yes' : 'no'
    }
  };
}

/**
 * Fallback to local logic when OpenAI is not available
 */
async function getLocalDriverResponse(
  input: string, 
  driverContext: any, 
  tools: any[], 
  context: AgentContext
): Promise<DriverAgentResult> {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('delivery') || lowerInput.includes('deliveries') || lowerInput.includes('route')) {
    return await handleDeliveryQuery(driverContext, tools, context);
  } else if (lowerInput.includes('earning') || lowerInput.includes('money') || lowerInput.includes('pay')) {
    return await handleEarningsQuery(driverContext, tools, context);
  } else if (lowerInput.includes('complete') || lowerInput.includes('finish')) {
    return handleDeliveryCompletion(driverContext);
  } else if (lowerInput.includes('help') || lowerInput.includes('assist')) {
    return handleGeneralHelp(driverContext);
  } else if (lowerInput.includes('navigation') || lowerInput.includes('direction') || lowerInput.includes('route')) {
    return handleNavigationQuery(driverContext);
  } else {
    return {
      response: "Hi! I'm your delivery assistant. I can help you with:\n\n• Checking your delivery schedule\n• Getting navigation directions\n• Tracking your earnings\n• Completing deliveries\n• General delivery support\n\nWhat would you like help with?",
      suggestedActions: generateDriverSuggestedActions(driverContext, input)
    };
  }
}

// Local handlers for driver-specific queries
async function handleDeliveryQuery(driverContext: any, tools: any[], context: AgentContext): Promise<DriverAgentResult> {
  try {
    const deliveriesTool = tools.find(t => t.name === 'get_my_deliveries');
    let deliveries = driverContext.activeDeliveries;
    if (deliveriesTool) {
      const result = await deliveriesTool.function({}, context);
      if (result.success) {
        deliveries = result.data;
      }
    }
    
    let response = `📋 Your Delivery Schedule:\n\n`;
    
    if (deliveries.length === 0) {
      response += "🎉 Great! You have no pending deliveries right now.\n\n";
      response += "You can:\n• Check your earnings for today\n• Update your availability status\n• Review completed deliveries";
    } else {
      response += `You have ${deliveries.length} active ${deliveries.length === 1 ? 'delivery' : 'deliveries'}:\n\n`;
      
      deliveries.slice(0, 5).forEach((delivery: any, idx: number) => {
        const eta = delivery.estimated_arrival ? new Date(delivery.estimated_arrival).toLocaleTimeString() : 'TBD';
        const address = delivery.delivery_address_full || delivery.delivery_address || 'Address not available';
        response += `${idx + 1}. 📦 ${delivery.tenant_name || 'Customer'}\n`;
        response += `   📍 ${address}\n`;
        response += `   ⏰ ETA: ${eta}\n`;
        response += `   💰 Est. earnings: £${delivery.estimated_earnings || '5.00'}\n\n`;
      });
      
      if (deliveries.length > 5) {
        response += `... and ${deliveries.length - 5} more deliveries\n\n`;
      }
    }
    
    return {
      response,
      suggestedActions: generateDriverSuggestedActions(driverContext, 'deliveries')
    };
  } catch (error) {
    return {
      response: "I couldn't retrieve your delivery information right now. Please try again or check the main delivery screen."
    };
  }
}

async function handleEarningsQuery(driverContext: any, tools: any[], context: AgentContext): Promise<DriverAgentResult> {
  try {
    const earningsTool = tools.find(t => t.name === 'get_driver_earnings');
    let earnings = null;
    if (earningsTool) {
      const result = await earningsTool.function({ period: 'today' }, context);
      if (result.success) {
        earnings = result.data;
      }
    }
    
    let response = `💰 Your Earnings Summary:\n\n`;
    
    if (earnings) {
      response += `📅 Today (${earnings.period_start}):\n`;
      response += `• Total earnings: £${earnings.total_earnings}\n`;
      response += `• Deliveries completed: ${earnings.total_deliveries}\n`;
      response += `• Distance covered: ${earnings.total_distance_km} km\n`;
      response += `• Hourly rate: £${earnings.earnings_per_hour}/hr\n`;
      response += `• On-time rate: ${earnings.on_time_delivery_rate}%\n\n`;
      
      if (earnings.total_deliveries > 0) {
        response += `Great job! Keep up the excellent work! 🚚✨`;
      } else {
        response += `Ready to start earning? Check your available deliveries! 🚀`;
      }
    } else {
      // Fallback calculation
      const todayEarnings = driverContext.todayStats.count * 5.5; // Base calculation
      response += `📅 Today's Progress:\n`;
      response += `• Completed deliveries: ${driverContext.todayStats.count}\n`;
      response += `• Estimated earnings: £${todayEarnings.toFixed(2)}\n`;
      response += `• Deliveries completed: ${driverContext.todayStats.count || 0}\n\n`;
      response += `Keep delivering to increase your earnings! 💪`;
    }
    
    return {
      response,
      suggestedActions: [
        { type: 'view_weekly_earnings', description: 'View weekly earnings report' },
        { type: 'check_deliveries', description: 'Check available deliveries' }
      ]
    };
  } catch (error) {
    return {
      response: "I couldn't retrieve your earnings information right now. Your earnings are calculated based on completed deliveries, distance, and performance bonuses."
    };
  }
}

function handleDeliveryCompletion(driverContext: any): DriverAgentResult {
  if (driverContext.activeDeliveries.length === 0) {
    return {
      response: "You don't have any active deliveries to complete right now. Great work on finishing your previous deliveries! 🎉"
    };
  }
  
  const nextDelivery = driverContext.activeDeliveries[0];
  let response = `📦 Ready to complete a delivery?\n\n`;
  response += `Next delivery: ${nextDelivery.tenant_name || 'Customer'}\n`;
  response += `Address: ${nextDelivery.delivery_address_full || nextDelivery.delivery_address}\n\n`;
  response += `To complete this delivery:\n`;
  response += `1. 📍 Make sure you're at the delivery location\n`;
  response += `2. 📸 Take a photo proof of delivery\n`;
  response += `3. ✅ Use the "Complete Delivery" button in the main app\n\n`;
  response += `Need help with anything specific about this delivery?`;
  
  return {
    response,
    suggestedActions: [
      { type: 'navigate_to_delivery', description: 'Get directions to delivery location' },
      { type: 'contact_customer', description: 'Call customer if needed' },
      { type: 'report_issue', description: 'Report delivery issue' }
    ]
  };
}

function handleNavigationQuery(driverContext: any): DriverAgentResult {
  if (driverContext.activeDeliveries.length === 0) {
    return {
      response: "You don't have any active deliveries requiring navigation right now. Check back when you have new deliveries assigned! 🗺️"
    };
  }
  
  const nextDelivery = driverContext.activeDeliveries[0];
  let response = `🗺️ Navigation Help:\n\n`;
  response += `Next stop: ${nextDelivery.tenant_name || 'Customer'}\n`;
  response += `📍 ${nextDelivery.delivery_address_full || nextDelivery.delivery_address}\n\n`;
  response += `💡 Navigation tips:\n`;
  response += `• Use the map in the main app for turn-by-turn directions\n`;
  response += `• Check delivery instructions for special entry requirements\n`;
  response += `• Contact customer if you can't find the location\n`;
  response += `• Update your location regularly for accurate tracking\n\n`;
  
  if (nextDelivery.delivery_instructions) {
    response += `📝 Special instructions: ${nextDelivery.delivery_instructions}`;
  }
  
  return {
    response,
    suggestedActions: [
      { type: 'open_navigation', description: 'Open navigation in map app' },
      { type: 'call_customer', description: 'Call customer for directions' },
      { type: 'mark_arrived', description: 'Mark as arrived when you reach location' }
    ]
  };
}

function handleGeneralHelp(driverContext: any): DriverAgentResult {
  let response = `🚚 Driver Assistant Help:\n\n`;
  response += `I can help you with:\n\n`;
  response += `📋 **Deliveries:**\n`;
  response += `• Check your delivery schedule\n`;
  response += `• Get navigation directions\n`;
  response += `• Complete deliveries\n`;
  response += `• Report delivery issues\n\n`;
  response += `💰 **Earnings:**\n`;
  response += `• Track daily/weekly earnings\n`;
  response += `• View performance metrics\n`;
  response += `• Understand payment breakdown\n\n`;
  response += `🗺️ **Navigation:**\n`;
  response += `• Get directions to delivery locations\n`;
  response += `• Optimize your route\n`;
  response += `• Handle location issues\n\n`;
  response += `📱 **General Support:**\n`;
  response += `• Update your status\n`;
  response += `• Contact customers\n`;
  response += `• Report technical issues\n\n`;
  response += `What would you like help with?`;
  
  return {
    response,
    suggestedActions: generateDriverSuggestedActions(driverContext, 'help')
  };
}

function generateDriverSuggestedActions(driverContext: any, input: string): Array<{type: string, description: string}> {
  const actions = [];
  
  if (driverContext.activeDeliveries.length > 0) {
    actions.push(
      { type: 'check_next_delivery', description: 'View next delivery details' },
      { type: 'get_navigation', description: 'Get directions to next delivery' }
    );
    
    // If driver seems to be asking about completion
    if (input.toLowerCase().includes('complete') || input.toLowerCase().includes('finish')) {
      actions.push({ type: 'complete_delivery', description: 'Complete current delivery' });
    }
  } else {
    actions.push({ type: 'check_for_new_deliveries', description: 'Check for new delivery assignments' });
  }
  
  // Always useful actions
  actions.push(
    { type: 'view_earnings', description: 'Check today\'s earnings' },
    { type: 'update_status', description: 'Update availability status' }
  );
  
  return actions;
}