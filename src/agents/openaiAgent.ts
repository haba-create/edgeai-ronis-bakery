import OpenAI from 'openai';
import { orderingAgentConfig } from './agentConfig';
import { getDb } from '@/utils/db';

// Initialize OpenAI client (requires OPENAI_API_KEY environment variable)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

interface AgentExecutionResult {
  response: string;
  suggestedActions?: Array<{
    type: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Execute the OpenAI agent with the given input
 * Uses OpenAI GPT-4 for intelligent analysis of inventory data
 */
export async function executeAgent(input: string): Promise<AgentExecutionResult> {
  console.log('Executing agent with input:', input);
  
  try {
    // Get current inventory data
    const inventoryData = await getCurrentInventoryData();
    
    // Use OpenAI for intelligent response if available, otherwise fall back to local logic
    if (openai) {
      return await getOpenAIResponse(input, inventoryData);
    } else {
      console.log('OpenAI API key not available, using local logic');
      return await getLocalResponse(input, inventoryData);
    }
  } catch (error) {
    console.error('Error in agent execution:', error);
    return {
      response: "I encountered an error while analyzing your inventory. Please try again or check your inventory manually.",
    };
  }
}

/**
 * Get current inventory data from database for AI analysis
 */
async function getCurrentInventoryData() {
  const db = await getDb();
  
  // Get all products with supplier info
  const products = await db.all(`
    SELECT p.*, s.name as supplier_name, s.lead_time as supplier_lead_time,
           s.delivery_schedule
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
  `);
  
  // Get critical and low stock items
  const criticalItems = products.filter(p => p.current_stock <= p.reorder_point * 0.5);
  const lowStockItems = products.filter(p => p.current_stock <= p.reorder_point && p.current_stock > p.reorder_point * 0.5);
  
  return {
    totalProducts: products.length,
    criticalItems,
    lowStockItems,
    healthyItems: products.filter(p => p.current_stock > p.reorder_point),
    allProducts: products
  };
}

/**
 * Use OpenAI GPT-4 for intelligent inventory analysis
 */
async function getOpenAIResponse(input: string, inventoryData: any): Promise<AgentExecutionResult> {
  const systemPrompt = `You are an AI assistant for Roni's Bagel Bakery in Belsize Park, London. You help with inventory management and ordering decisions.

Current inventory status:
- Total products: ${inventoryData.totalProducts}
- Critical items (≤50% of reorder point): ${inventoryData.criticalItems.length}
- Low stock items (≤reorder point): ${inventoryData.lowStockItems.length}

Critical items needing immediate attention:
${inventoryData.criticalItems.map((item: any) => 
  `- ${item.name}: ${item.current_stock} ${item.unit} (reorder point: ${item.reorder_point}, supplier: ${item.supplier_name})`
).join('\n')}

Low stock items:
${inventoryData.lowStockItems.map((item: any) => 
  `- ${item.name}: ${item.current_stock} ${item.unit} (reorder point: ${item.reorder_point}, supplier: ${item.supplier_name})`
).join('\n')}

Provide helpful, specific advice about inventory management, ordering priorities, and operational recommendations.`;

  const completion = await openai!.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: input }
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

  // Generate suggested actions based on the response
  const suggestedActions = [];
  if (inventoryData.criticalItems.length > 0) {
    suggestedActions.push({
      type: 'urgent_order',
      description: 'Place urgent orders for critical items'
    });
  }
  if (inventoryData.lowStockItems.length > 0) {
    suggestedActions.push({
      type: 'regular_order',
      description: 'Schedule regular orders for low stock items'
    });
  }

  return {
    response,
    suggestedActions,
    metadata: {
      aiProvider: 'openai',
      criticalCount: inventoryData.criticalItems.length,
      lowStockCount: inventoryData.lowStockItems.length
    }
  };
}

/**
 * Fallback to local logic when OpenAI is not available
 */
async function getLocalResponse(input: string, inventoryData: any): Promise<AgentExecutionResult> {
  const lowerInput = input.toLowerCase();
  
  // Check for different query types and generate appropriate responses
  if (lowerInput.includes('stock') || lowerInput.includes('inventory')) {
    return handleInventoryQuery(inventoryData);
  } else if (lowerInput.includes('order') && (
    lowerInput.includes('place') || lowerInput.includes('new') || lowerInput.includes('create')
  )) {
    return handleOrderPlacement(input, inventoryData);
  } else if (lowerInput.includes('recommendation') || lowerInput.includes('suggest')) {
    return handleRecommendations(inventoryData);
  } else {
    return {
      response: "I understand you'd like assistance with ordering. Could you please specify if you need information about current inventory, placing a new order, or recommendations based on your consumption patterns?",
    };
  }
}

// Local handlers for different query types when OpenAI is not available
function handleInventoryQuery(inventoryData: any): AgentExecutionResult {
  let response = `Current Inventory Status for Roni's Bakery:\n\n`;
  response += `Total Products: ${inventoryData.totalProducts}\n`;
  response += `Critical Items: ${inventoryData.criticalItems.length}\n`;
  response += `Low Stock Items: ${inventoryData.lowStockItems.length}\n\n`;
  
  if (inventoryData.criticalItems.length > 0) {
    response += `Critical Items (need immediate attention):\n`;
    inventoryData.criticalItems.forEach((item: any) => {
      response += `- ${item.name}: ${item.current_stock} ${item.unit} (reorder point: ${item.reorder_point}, supplier: ${item.supplier_name})\n`;
    });
    response += '\n';
  }
  
  if (inventoryData.lowStockItems.length > 0) {
    response += `Low Stock Items:\n`;
    inventoryData.lowStockItems.forEach((item: any) => {
      response += `- ${item.name}: ${item.current_stock} ${item.unit} (reorder point: ${item.reorder_point}, supplier: ${item.supplier_name})\n`;
    });
    response += '\n';
  }
  
  if (inventoryData.criticalItems.length === 0 && inventoryData.lowStockItems.length === 0) {
    response += "Good news! All inventory items are at healthy levels.\n";
  }
  
  return {
    response,
    suggestedActions: [
      {
        type: 'view_inventory_details',
        description: 'View detailed inventory report'
      },
      {
        type: 'place_order',
        description: 'Place orders for low stock items'
      }
    ]
  };
}

function handleOrderPlacement(input: string, inventoryData: any): AgentExecutionResult {
  const urgentItems = inventoryData.criticalItems.slice(0, 3);
  
  let response = "I'll help you place an order. Based on your current inventory levels, I recommend ordering:\n\n";
  
  if (urgentItems.length > 0) {
    urgentItems.forEach((item: any, index: number) => {
      response += `${index + 1}. ${item.name} - ${item.order_quantity} ${item.unit} (URGENT - supplier: ${item.supplier_name})\n`;
    });
  } else {
    response += "No urgent orders needed at this time. All items are at healthy levels.\n";
  }
  
  response += "\nWould you like me to proceed with these orders?";
  
  return {
    response,
    suggestedActions: [
      {
        type: 'confirm_order',
        description: 'Confirm and place this order'
      },
      {
        type: 'modify_order',
        description: 'Modify items or quantities'
      }
    ]
  };
}

function handleRecommendations(inventoryData: any): AgentExecutionResult {
  let response = "Based on your current inventory levels and consumption patterns, here are my recommendations:\n\n";
  
  if (inventoryData.criticalItems.length > 0) {
    response += "URGENT ACTIONS NEEDED:\n";
    inventoryData.criticalItems.forEach((item: any, index: number) => {
      const daysLeft = Math.max(0, Math.floor(item.current_stock / item.daily_usage));
      response += `${index + 1}. Order ${item.name} immediately - only ${daysLeft} days of stock remaining\n`;
    });
    response += '\n';
  }
  
  if (inventoryData.lowStockItems.length > 0) {
    response += "RECOMMENDED ORDERS:\n";
    inventoryData.lowStockItems.forEach((item: any, index: number) => {
      response += `${index + 1}. Schedule order for ${item.name} - approaching reorder point\n`;
    });
    response += '\n';
  }
  
  if (inventoryData.criticalItems.length === 0 && inventoryData.lowStockItems.length === 0) {
    response += "Excellent! Your inventory is well-managed. Consider:\n";
    response += "- Reviewing usage patterns for seasonal adjustments\n";
    response += "- Checking upcoming delivery schedules\n";
    response += "- Planning for special events or holidays\n";
  }
  
  return {
    response,
    metadata: {
      aiProvider: 'local',
      criticalCount: inventoryData.criticalItems.length,
      lowStockCount: inventoryData.lowStockItems.length
    }
  };
}
