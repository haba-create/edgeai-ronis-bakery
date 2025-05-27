import { getDb } from '@/utils/db';
import { getStockAlerts, getConsumptionTrends } from '@/services/productService';
import { getPendingOrders, generateRecommendedOrder } from '@/services/orderService';

/**
 * Process an agent request and generate an appropriate response
 * @param query The user's query
 */
export async function processAgentRequest(query: string): Promise<string> {
  // Convert query to lowercase for easier matching
  const lowerQuery = query.toLowerCase();
  
  try {
    // Get current inventory status
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
      return await getInventoryStatus();
    }
    
    // Get low stock or alerts information
    if (lowerQuery.includes('low stock') || lowerQuery.includes('alert')) {
      return await getLowStockInfo();
    }
    
    // Get order recommendations
    if (lowerQuery.includes('what should') || lowerQuery.includes('recommend') || 
        lowerQuery.includes('what to order') || lowerQuery.includes('need to order')) {
      return await getOrderRecommendations();
    }
    
    // Get pending orders
    if (lowerQuery.includes('pending order') || lowerQuery.includes('order status')) {
      return await getPendingOrdersInfo();
    }
    
    // Get consumption trends
    if (lowerQuery.includes('trend') || lowerQuery.includes('consumption') || 
        lowerQuery.includes('usage')) {
      return await getConsumptionTrendsInfo();
    }
    
    // Handle help query
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
      return getHelpInfo();
    }
    
    // Default response
    return await getInventoryStatus();
  } catch (error) {
    console.error('Error in agent implementation:', error);
    return "I'm sorry, I encountered an error while processing your request. Please try again.";
  }
}

async function getInventoryStatus(): Promise<string> {
  const db = await getDb();
  
  // Get critical and low stock items
  const criticalItems = await db.all(`
    SELECT name, current_stock, unit, reorder_point 
    FROM products 
    WHERE current_stock <= reorder_point * 0.5
    ORDER BY (current_stock / reorder_point) ASC
  `);
  
  const lowStockItems = await db.all(`
    SELECT name, current_stock, unit, reorder_point 
    FROM products 
    WHERE current_stock <= reorder_point AND current_stock > reorder_point * 0.5
    ORDER BY (current_stock / reorder_point) ASC
  `);
  
  // Get total inventory count
  const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
  
  let response = `Current Inventory Status for Roni's Bakery:\n\n`;
  
  response += `Total Products: ${totalProducts.count}\n`;
  response += `Critical Items: ${criticalItems.length}\n`;
  response += `Low Stock Items: ${lowStockItems.length}\n\n`;
  
  if (criticalItems.length > 0) {
    response += `Critical Items (need immediate attention):\n`;
    criticalItems.forEach(item => {
      response += `- ${item.name}: ${item.current_stock} ${item.unit}s (reorder point: ${item.reorder_point})\n`;
    });
    response += '\n';
  }
  
  if (lowStockItems.length > 0) {
    response += `Low Stock Items:\n`;
    lowStockItems.forEach(item => {
      response += `- ${item.name}: ${item.current_stock} ${item.unit}s (reorder point: ${item.reorder_point})\n`;
    });
    response += '\n';
  }
  
  if (criticalItems.length === 0 && lowStockItems.length === 0) {
    response += "Good news! All inventory items are at healthy levels.\n";
  } else {
    response += "Would you like me to recommend what to order? Just ask 'What should we order today?'\n";
  }
  
  return response;
}

async function getLowStockInfo(): Promise<string> {
  const alerts = await getStockAlerts();
  
  if (alerts.length === 0) {
    return "Good news! There are no low stock alerts at the moment. All inventory levels are healthy.";
  }
  
  const criticalAlerts = alerts.filter(alert => alert.priority === 'high');
  const warningAlerts = alerts.filter(alert => alert.priority === 'medium');
  const lowPriorityAlerts = alerts.filter(alert => alert.priority === 'low');
  
  let response = `Inventory Alerts for Roni's Bakery:\n\n`;
  
  if (criticalAlerts.length > 0) {
    response += `CRITICAL ALERTS (${criticalAlerts.length}):\n`;
    criticalAlerts.forEach(alert => {
      const product = alert.product;
      response += `- ${product.name}: ${product.current_stock} ${product.unit}s (${Math.round((product.current_stock / product.reorder_point) * 100)}% of reorder point)\n`;
      response += `  Predicted stockout in ${product.days_until_stockout} days. Recommended order: ${alert.recommended_order_quantity} ${product.unit}s\n`;
    });
    response += '\n';
  }
  
  if (warningAlerts.length > 0) {
    response += `WARNING ALERTS (${warningAlerts.length}):\n`;
    warningAlerts.forEach(alert => {
      const product = alert.product;
      response += `- ${product.name}: ${product.current_stock} ${product.unit}s (${Math.round((product.current_stock / product.reorder_point) * 100)}% of reorder point)\n`;
    });
    response += '\n';
  }
  
  if (lowPriorityAlerts.length > 0) {
    response += `LOW PRIORITY ALERTS (${lowPriorityAlerts.length}):\n`;
    lowPriorityAlerts.forEach(alert => {
      const product = alert.product;
      response += `- ${product.name}: ${product.current_stock} ${product.unit}s (${Math.round((product.current_stock / product.reorder_point) * 100)}% of reorder point)\n`;
    });
    response += '\n';
  }
  
  if (criticalAlerts.length > 0) {
    response += "Would you like me to create purchase orders for the critical items? You can ask me 'What should we order today?'";
  }
  
  return response;
}

async function getOrderRecommendations(): Promise<string> {
  const recommendations = await generateRecommendedOrder();
  
  if (Object.keys(recommendations).length === 0) {
    return "Good news! All inventory levels are healthy, and there's nothing that needs to be ordered at the moment.";
  }
  
  let response = `Here are my order recommendations for Roni's Bakery:\n\n`;
  
  for (const [supplierId, items] of Object.entries(recommendations)) {
    const supplier = items[0].product.supplier;
    response += `Order from ${supplier.name} (${supplier.lead_time} day lead time):\n`;
    
    items.forEach(item => {
      const urgency = item.product.stock_status === 'critical' ? ' (URGENT)' : '';
      response += `- ${item.product.name}: ${item.quantity} ${item.product.unit}s${urgency}\n`;
    });
    
    response += '\n';
  }
  
  response += "You can place these orders from the Orders page. Would you like me to help with anything else?";
  
  return response;
}

async function getPendingOrdersInfo(): Promise<string> {
  const pendingOrders = await getPendingOrders();
  
  if (pendingOrders.length === 0) {
    return "There are no pending orders at the moment. All previous orders have been delivered.";
  }
  
  let response = `Pending Orders for Roni's Bakery:\n\n`;
  
  pendingOrders.forEach(order => {
    response += `Order #${order.id} from ${order.supplier?.name}:\n`;
    response += `- Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}\n`;
    response += `- Order Date: ${formatDate(order.order_date)}\n`;
    
    if (order.expected_delivery) {
      response += `- Expected Delivery: ${formatDate(order.expected_delivery)}\n`;
    }
    
    if (order.total_cost) {
      response += `- Total Cost: £${order.total_cost.toFixed(2)}\n`;
    }
    
    response += '\n';
  });
  
  return response;
}

async function getConsumptionTrendsInfo(): Promise<string> {
  const trends = await getConsumptionTrends();
  
  if (trends.length === 0) {
    return "I don't have enough consumption data to analyze trends yet. Please check back after recording more usage.";
  }
  
  // Sort trends by trend percentage (absolute value) to show most significant changes first
  const sortedTrends = [...trends].sort((a, b) => 
    Math.abs(b.trend_percentage) - Math.abs(a.trend_percentage)
  );
  
  const increasingTrends = sortedTrends.filter(trend => trend.trend_direction === 'increasing');
  const decreasingTrends = sortedTrends.filter(trend => trend.trend_direction === 'decreasing');
  const stableTrends = sortedTrends.filter(trend => trend.trend_direction === 'stable');
  
  let response = `Consumption Trends for Roni's Bakery (Last 7 Days):\n\n`;
  
  if (increasingTrends.length > 0) {
    response += `Products with INCREASING usage:\n`;
    increasingTrends.forEach(trend => {
      response += `- ${trend.product_name}: ${trend.avg_daily_consumption.toFixed(2)} units/day (↑ ${Math.abs(trend.trend_percentage).toFixed(1)}%)\n`;
    });
    response += '\n';
  }
  
  if (decreasingTrends.length > 0) {
    response += `Products with DECREASING usage:\n`;
    decreasingTrends.forEach(trend => {
      response += `- ${trend.product_name}: ${trend.avg_daily_consumption.toFixed(2)} units/day (↓ ${Math.abs(trend.trend_percentage).toFixed(1)}%)\n`;
    });
    response += '\n';
  }
  
  if (stableTrends.length > 0 && (increasingTrends.length > 0 || decreasingTrends.length > 0)) {
    response += `Products with stable usage: ${stableTrends.map(t => t.product_name).join(', ')}\n\n`;
  }
  
  // Add recommendations based on trends
  if (increasingTrends.length > 0) {
    response += "Recommendations based on trends:\n";
    response += "- Consider increasing your next order quantities for products with rising demand\n";
    response += "- Adjust reorder points for seasonal items showing increased usage\n";
    
    // Highlight any increasing trends that are also low in stock
    const criticalIncreasing = increasingTrends.filter(trend => {
      const product = productsData.products.find((p: any) => p.id === trend.product_id);
      return product && product.current_stock <= product.reorder_point;
    });
    
    if (criticalIncreasing.length > 0) {
      response += "\nWARNING: The following products have both increasing demand AND low stock levels:\n";
      criticalIncreasing.forEach(trend => {
        response += `- ${trend.product_name}\n`;
      });
    }
  }
  
  return response;
}

function getHelpInfo(): string {
  return `I'm your bakery inventory assistant for Roni's Bakery in Belsize Park. Here's how I can help you:\n\n` +
    `1. Check inventory status: Ask "What's our current inventory?" or "How are our stock levels?"\n` +
    `2. View low stock alerts: Ask "What items are low in stock?" or "Show me inventory alerts"\n` +
    `3. Get order recommendations: Ask "What should we order today?" or "What do we need to order?"\n` +
    `4. Check pending orders: Ask "What orders are pending?" or "What's the status of our orders?"\n` +
    `5. View consumption trends: Ask "Show me usage trends" or "How has our consumption been?"\n\n` +
    `Feel free to ask me any of these questions, and I'll provide you with the information you need!`;
}

// Helper function to format dates
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Get products data for reference
const productsData = require('@/data/products.json');
