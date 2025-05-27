import productsData from '@/data/products.json';

// This is a simplified agent implementation
// In a real app, this would use the OpenAI Agents SDK
export async function processAgentRequest(userQuery: string): Promise<string> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const query = userQuery.toLowerCase();
  
  // Handle different types of queries
  if (query.includes('what should we order') || query.includes('what do we need')) {
    return generateOrderRecommendations();
  }
  
  if (query.includes('low stock') || query.includes('running out')) {
    return generateLowStockReport();
  }
  
  if (query.includes('consumption') || query.includes('usage')) {
    return generateConsumptionInsights();
  }
  
  if (query.includes('order') && query.includes('status')) {
    return generateOrderStatus();
  }
  
  // Default response with inventory status
  return `Based on your inventory, I recommend prioritizing orders for the following items:\n\n${generateOrderRecommendations()}`;
}

function generateOrderRecommendations(): string {
  const { products, suppliers } = productsData;
  
  // Find products below reorder point
  const lowStockItems = products.filter(product => 
    product.current_stock <= product.reorder_point
  ).sort((a, b) => (a.current_stock / a.reorder_point) - (b.current_stock / b.reorder_point));
  
  if (lowStockItems.length === 0) {
    return "Good news! You don't have any items below reorder points. All inventory levels are healthy.";
  }
  
  // Group items by supplier
  const itemsBySupplier: Record<string, any[]> = {};
  lowStockItems.forEach(item => {
    const supplier = suppliers.find(s => s.id === item.supplier_id);
    const supplierName = supplier ? supplier.name : 'Unknown Supplier';
    if (!itemsBySupplier[supplierName]) {
      itemsBySupplier[supplierName] = [];
    }
    itemsBySupplier[supplierName].push(item);
  });
  
  // Generate recommendations
  let response = "Based on current stock levels and consumption rates, I recommend ordering:\n\n";
  
  Object.entries(itemsBySupplier).forEach(([supplier, items]) => {
    response += `From ${supplier}:\n`;
    items.forEach(item => {
      const amountToOrder = item.optimal_stock - item.current_stock;
      response += `- ${item.name}: ${amountToOrder} ${item.unit}s (currently at ${item.current_stock} ${item.unit}s)\n`;
    });
    response += "\n";
  });
  
  // Add urgency for critical items
  const criticalItems = lowStockItems.filter(item => 
    item.current_stock <= item.reorder_point * 0.5
  );
  
  if (criticalItems.length > 0) {
    response += "URGENT ITEMS: " + criticalItems.map(item => item.name).join(", ") + 
      " are critically low and should be ordered immediately.";
  }
  
  return response;
}

function generateLowStockReport(): string {
  const { products } = productsData;
  
  // Find products below reorder point
  const lowStockItems = products.filter(product => 
    product.current_stock <= product.reorder_point
  );
  
  if (lowStockItems.length === 0) {
    return "You don't have any items below reorder points right now. All inventory levels are good.";
  }
  
  let response = `You have ${lowStockItems.length} items below their reorder points:\n\n`;
  
  lowStockItems.forEach(item => {
    const percentRemaining = (item.current_stock / item.reorder_point) * 100;
    const status = percentRemaining <= 50 ? "CRITICAL" : "LOW";
    
    response += `${status}: ${item.name} - ${item.current_stock} ${item.unit}s remaining ` +
      `(${item.reorder_point} reorder point). Predicted stockout by ${item.predicted_stockout}\n`;
  });
  
  return response;
}

function generateConsumptionInsights(): string {
  const { products, consumptionHistory } = productsData;
  
  // Calculate average consumption for each product
  const avgConsumption: Record<number, number> = {};
  const productCounts: Record<number, number> = {};
  
  consumptionHistory.forEach(day => {
    day.products.forEach(product => {
      if (!avgConsumption[product.productId]) {
        avgConsumption[product.productId] = 0;
        productCounts[product.productId] = 0;
      }
      avgConsumption[product.productId] += product.quantity;
      productCounts[product.productId] += 1;
    });
  });
  
  // Calculate averages
  Object.keys(avgConsumption).forEach(id => {
    const productId = parseInt(id);
    avgConsumption[productId] = avgConsumption[productId] / productCounts[productId];
  });
  
  // Find trending products (higher than normal usage)
  const trendingProducts = Object.entries(avgConsumption)
    .map(([id, avg]) => {
      const productId = parseInt(id);
      const product = products.find(p => p.id === productId);
      if (!product) return null;
      
      const ratio = avg / product.consumption_rate;
      return { ...product, ratio, avgConsumption: avg };
    })
    .filter(item => item && item.ratio > 1.1)
    .sort((a, b) => b!.ratio - a!.ratio);
  
  let response = "Based on the last 7 days of consumption data:\n\n";
  
  if (trendingProducts.length > 0) {
    response += "Products with increasing demand:\n";
    trendingProducts.forEach(product => {
      if (!product) return;
      const percentIncrease = ((product.ratio - 1) * 100).toFixed(1);
      response += `- ${product.name}: ${percentIncrease}% higher usage than normal ` +
        `(${product.avgConsumption.toFixed(1)} ${product.unit}s/day vs ${product.consumption_rate} avg)\n`;
    });
  } else {
    response += "No significant changes in consumption patterns detected.\n";
  }
  
  // Add recommendations based on consumption
  response += "\nRecommendations based on consumption trends:\n";
  if (trendingProducts.length > 0) {
    response += "- Consider increasing your next order quantities for trending items\n";
    response += "- Adjust reorder points to account for increased demand\n";
  } else {
    response += "- Current consumption is stable, maintain regular ordering patterns\n";
  }
  
  return response;
}

function generateOrderStatus(): string {
  const { orders, suppliers, products } = productsData;
  
  // Filter for pending orders
  const pendingOrders = orders.filter(order => order.status === 'pending');
  
  if (pendingOrders.length === 0) {
    return "You don't have any pending orders at the moment. All recent orders have been delivered.";
  }
  
  let response = `You have ${pendingOrders.length} pending order(s):\n\n`;
  
  pendingOrders.forEach(order => {
    const supplier = suppliers.find(s => s.name === order.supplier);
    response += `Order #${order.id} with ${order.supplier}\n`;
    response += `Placed on: ${order.date}\n`;
    
    if (supplier) {
      const estimatedDelivery = new Date(order.date);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + supplier.lead_time);
      response += `Estimated delivery: ${estimatedDelivery.toISOString().split('T')[0]}\n`;
    }
    
    response += "Items:\n";
    order.items.forEach((item: any) => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        response += `- ${product.name}: ${item.quantity} ${product.unit}(s)\n`;
      }
    });
    
    response += "\n";
  });
  
  return response;
}
