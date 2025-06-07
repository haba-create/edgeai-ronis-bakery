import { getDb } from '@/utils/db';

export async function generateHistoricalData() {
  const db = await getDb();
  console.log('Generating 12 months of historical data...');
  
  // Generate data for the past 12 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  
  // Create realistic customer base
  const customers = await generateCustomers(db);
  console.log(`Generated ${customers.length} customers`);
  
  // Generate daily sales data
  await generateDailySalesData(db, startDate, endDate, customers);
  console.log('Generated daily sales analytics');
  
  // Generate monthly business metrics
  await generateMonthlyMetrics(db, startDate, endDate);
  console.log('Generated monthly business metrics');
  
  // Generate product performance history
  await generateProductPerformanceHistory(db, startDate, endDate);
  console.log('Generated product performance history');
  
  // Generate customer behavior analytics
  await generateCustomerBehaviorData(db, startDate, endDate, customers);
  console.log('Generated customer behavior analytics');
  
  // Generate supplier performance history
  await generateSupplierPerformanceHistory(db, startDate, endDate);
  console.log('Generated supplier performance history');
  
  // Generate inventory movements
  await generateInventoryMovements(db, startDate, endDate);
  console.log('Generated inventory movements');
  
  // Generate seasonal trends
  await generateSeasonalTrends(db);
  console.log('Generated seasonal trends');
  
  // Generate customer lifetime value data
  await generateCustomerLifetimeValue(db, customers);
  console.log('Generated customer lifetime value data');
  
  // Generate demand forecasting data
  await generateDemandForecasting(db, endDate);
  console.log('Generated demand forecasting data');
  
  console.log('Historical data generation completed!');
}

async function generateCustomers(db: any) {
  const customers = [];
  const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eva Brown', 'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Iris Chen', 'Jack Anderson', 'Kate Thompson', 'Leo Martinez', 'Maya Patel', 'Noah Garcia', 'Olivia Rodriguez', 'Paul Kim', 'Quinn O\'Brien', 'Ruby Singh', 'Sam Jackson', 'Tina Wong', 'Uma Sharma', 'Victor Ng', 'Wendy Liu', 'Xavier Costa', 'Yuki Tanaka', 'Zoe Adams', 'Aaron Clarke', 'Beth Moore', 'Chris Evans', 'Diana Prince'];
  const emails = names.map(name => name.toLowerCase().replace(' ', '.') + '@example.com');
  const acquisitionChannels = ['google_ads', 'facebook', 'instagram', 'word_of_mouth', 'local_newspaper', 'delivery_app', 'walking_by'];
  const segments = ['premium', 'regular', 'budget', 'occasional'];
  
  for (let i = 0; i < names.length; i++) {
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 365));
    
    await db.run(
      `INSERT INTO users (email, password_hash, full_name, phone, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        emails[i],
        'hashed_password_' + i,
        names[i],
        '+44 20 ' + (7000 + Math.floor(Math.random() * 1000)) + ' ' + Math.floor(Math.random() * 10000),
        'client',
        true,
        joinDate.toISOString()
      ]
    );
    
    const userId = (await db.get('SELECT last_insert_rowid() as id')).id;
    
    // Add customer address
    const addresses = [
      { street: '123 Belsize Park Gardens', city: 'London', postcode: 'NW3 4BH', lat: 51.5497, lng: -0.1738 },
      { street: '45 Primrose Hill Road', city: 'London', postcode: 'NW1 8YD', lat: 51.5441, lng: -0.1634 },
      { street: '78 Hampstead High Street', city: 'London', postcode: 'NW3 1QX', lat: 51.5557, lng: -0.1778 },
      { street: '92 Camden High Street', city: 'London', postcode: 'NW1 0LT', lat: 51.5393, lng: -0.1426 },
      { street: '156 Regents Park Road', city: 'London', postcode: 'NW1 8XN', lat: 51.5464, lng: -0.1572 }
    ];
    
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    
    await db.run(
      `INSERT INTO client_addresses (user_id, address_label, street_address, city, postcode, latitude, longitude, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'Home', address.street, address.city, address.postcode, address.lat, address.lng, 1]
    );
    
    // Add to customer lifetime value table
    await db.run(
      `INSERT INTO customer_lifetime_value (user_id, first_order_date, customer_segment, acquisition_channel, acquisition_cost)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        joinDate.toISOString().split('T')[0],
        segments[Math.floor(Math.random() * segments.length)],
        acquisitionChannels[Math.floor(Math.random() * acquisitionChannels.length)],
        15 + Math.random() * 35 // £15-50 acquisition cost
      ]
    );
    
    customers.push({ id: userId, name: names[i], joinDate, segment: segments[Math.floor(Math.random() * segments.length)] });
  }
  
  return customers;
}

async function generateDailySalesData(db: any, startDate: Date, endDate: Date, customers: any[]) {
  const currentDate = new Date(startDate);
  const weatherConditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const holidays = ['2024-01-01', '2024-03-29', '2024-04-01', '2024-05-01', '2024-05-27', '2024-08-26', '2024-12-25', '2024-12-26'];
  
  while (currentDate <= endDate) {
    const dayOfWeek = dayNames[currentDate.getDay()];
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const isHoliday = holidays.includes(currentDate.toISOString().split('T')[0]);
    
    // Generate realistic daily metrics
    const baseOrders = isWeekend ? 25 : 40; // Lower on weekends
    const holidayMultiplier = isHoliday ? 0.3 : 1;
    const weatherMultiplier = Math.random() * 0.3 + 0.85; // Weather impact
    
    const totalOrders = Math.floor(baseOrders * holidayMultiplier * weatherMultiplier);
    const avgOrderValue = 8 + Math.random() * 12; // £8-20
    const totalRevenue = totalOrders * avgOrderValue;
    const newCustomers = Math.floor(totalOrders * 0.15); // 15% new customers
    const deliveryRate = 0.85 + Math.random() * 0.14; // 85-99%
    const satisfaction = 4.2 + Math.random() * 0.7; // 4.2-4.9 stars
    
    const peakHours = isWeekend ? ['10:00', '11:00', '15:00'] : ['08:00', '12:00', '17:00'];
    const peakHour = peakHours[Math.floor(Math.random() * peakHours.length)];
    
    // Get random top product
    const products = await db.all('SELECT id FROM products LIMIT 10');
    const topProductId = products[Math.floor(Math.random() * products.length)].id;
    
    await db.run(
      `INSERT INTO daily_sales_analytics 
       (date, total_orders, total_revenue, total_customers, new_customers, average_order_value,
        delivery_completion_rate, customer_satisfaction_avg, peak_hour, top_product_id,
        weather_condition, day_of_week, is_holiday)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentDate.toISOString().split('T')[0],
        totalOrders,
        Math.round(totalRevenue * 100) / 100,
        Math.floor(totalOrders * 0.7), // Assuming some repeat customers
        newCustomers,
        Math.round(avgOrderValue * 100) / 100,
        Math.round(deliveryRate * 1000) / 1000,
        Math.round(satisfaction * 10) / 10,
        peakHour,
        topProductId,
        weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
        dayOfWeek,
        isHoliday
      ]
    );
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

async function generateMonthlyMetrics(db: any, startDate: Date, endDate: Date) {
  const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Get daily data for this month
    const monthlyData = await db.all(
      `SELECT SUM(total_orders) as orders, SUM(total_revenue) as revenue,
              AVG(customer_satisfaction_avg) as satisfaction, AVG(delivery_completion_rate) as delivery_rate
       FROM daily_sales_analytics 
       WHERE strftime('%Y-%m', date) = ?`,
      [`${year}-${month.toString().padStart(2, '0')}`]
    );
    
    const data = monthlyData[0] || {};
    const revenue = data.revenue || 15000 + Math.random() * 10000;
    const orders = data.orders || Math.floor(revenue / 12);
    const uniqueCustomers = Math.floor(orders * 0.6); // Customer repeat rate
    
    await db.run(
      `INSERT INTO monthly_business_metrics 
       (year, month, total_revenue, total_orders, unique_customers, customer_retention_rate,
        average_order_value, gross_margin_percentage, operating_costs, net_profit,
        inventory_turnover, supplier_performance_avg, delivery_success_rate, customer_satisfaction_avg,
        marketing_spend, staff_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        year, month,
        Math.round(revenue * 100) / 100,
        orders,
        uniqueCustomers,
        0.65 + Math.random() * 0.25, // 65-90% retention
        Math.round((revenue / orders) * 100) / 100,
        0.35 + Math.random() * 0.15, // 35-50% gross margin
        revenue * (0.25 + Math.random() * 0.15), // 25-40% operating costs
        revenue * (0.08 + Math.random() * 0.12), // 8-20% net profit
        4 + Math.random() * 3, // 4-7 inventory turnover
        4.2 + Math.random() * 0.6, // Supplier performance 4.2-4.8
        data.delivery_rate || (0.85 + Math.random() * 0.14),
        data.satisfaction || (4.2 + Math.random() * 0.7),
        revenue * (0.05 + Math.random() * 0.05), // 5-10% marketing spend
        600 + Math.random() * 200 // 600-800 staff hours
      ]
    );
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
}

async function generateProductPerformanceHistory(db: any, startDate: Date, endDate: Date) {
  const products = await db.all('SELECT id, name, price, category FROM products');
  
  for (const product of products) {
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const baseUnits = Math.floor(Math.random() * 20) + 5; // 5-25 units per day
      const seasonalMultiplier = getSeasonalMultiplier(product.category, currentDate);
      const unitsSold = Math.floor(baseUnits * seasonalMultiplier);
      
      const revenue = unitsSold * product.price;
      const costOfGoods = revenue * (0.4 + Math.random() * 0.2); // 40-60% COGS
      const grossProfit = revenue - costOfGoods;
      
      const stockStart = 50 + Math.floor(Math.random() * 100);
      const stockEnd = Math.max(0, stockStart - unitsSold + Math.floor(Math.random() * 30));
      
      await db.run(
        `INSERT INTO product_performance_history
         (product_id, date, units_sold, revenue, cost_of_goods, gross_profit,
          stock_level_start, stock_level_end, restock_count, out_of_stock_hours,
          average_rating, review_count, return_count, waste_units)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          currentDate.toISOString().split('T')[0],
          unitsSold,
          Math.round(revenue * 100) / 100,
          Math.round(costOfGoods * 100) / 100,
          Math.round(grossProfit * 100) / 100,
          stockStart,
          stockEnd,
          stockEnd < 20 ? 1 : 0, // Restock if low
          stockEnd === 0 ? Math.floor(Math.random() * 8) : 0, // Out of stock hours
          4.2 + Math.random() * 0.7,
          Math.floor(unitsSold * 0.1), // 10% review rate
          Math.floor(unitsSold * 0.02), // 2% return rate
          Math.floor(unitsSold * 0.05) // 5% waste
        ]
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
}

async function generateCustomerBehaviorData(db: any, startDate: Date, endDate: Date, customers: any[]) {
  for (const customer of customers) {
    const currentDate = new Date(Math.max(startDate.getTime(), customer.joinDate.getTime()));
    
    while (currentDate <= endDate) {
      // Skip some days (customers don't visit every day)
      if (Math.random() < 0.8) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      const sessionCount = Math.floor(Math.random() * 3) + 1; // 1-3 sessions
      const pageViews = sessionCount * (3 + Math.floor(Math.random() * 8)); // 3-10 pages per session
      const timeSpent = sessionCount * (5 + Math.floor(Math.random() * 15)); // 5-20 min per session
      
      const categories = ['bakery_products', 'coffee', 'deli', 'dairy'];
      const devices = ['mobile', 'desktop', 'tablet'];
      const referrals = ['direct', 'google', 'social', 'email'];
      
      await db.run(
        `INSERT INTO customer_behavior_analytics
         (user_id, date, session_count, page_views, time_spent_minutes, products_viewed,
          cart_additions, cart_abandonments, orders_placed, total_spent, preferred_categories,
          peak_activity_hour, device_type, referral_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.id,
          currentDate.toISOString().split('T')[0],
          sessionCount,
          pageViews,
          timeSpent,
          Math.floor(pageViews * 0.6), // 60% product pages
          Math.floor(Math.random() * 3), // 0-2 cart additions
          Math.random() < 0.3 ? 1 : 0, // 30% cart abandonment
          Math.random() < 0.2 ? 1 : 0, // 20% purchase rate
          Math.random() < 0.2 ? (8 + Math.random() * 20) : 0, // Purchase amount
          categories[Math.floor(Math.random() * categories.length)],
          Math.floor(Math.random() * 14) + 8, // 8am-10pm
          devices[Math.floor(Math.random() * devices.length)],
          referrals[Math.floor(Math.random() * referrals.length)]
        ]
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
}

async function generateSupplierPerformanceHistory(db: any, startDate: Date, endDate: Date) {
  const suppliers = await db.all('SELECT id, name FROM suppliers');
  
  for (const supplier of suppliers) {
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const ordersPlaced = Math.floor(Math.random() * 5) + 1; // 1-5 orders per day
      const deliveryRate = 0.85 + Math.random() * 0.14; // 85-99%
      const ordersDelivered = Math.floor(ordersPlaced * deliveryRate);
      const ordersDelayed = Math.floor((ordersPlaced - ordersDelivered) * 0.7);
      const ordersCancelled = ordersPlaced - ordersDelivered - ordersDelayed;
      
      await db.run(
        `INSERT INTO supplier_performance_history
         (supplier_id, date, orders_placed, orders_delivered, orders_delayed, orders_cancelled,
          average_delivery_time_hours, quality_score, cost_efficiency_score, communication_score,
          total_order_value, defect_rate_percentage, on_time_delivery_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplier.id,
          currentDate.toISOString().split('T')[0],
          ordersPlaced,
          ordersDelivered,
          ordersDelayed,
          ordersCancelled,
          12 + Math.random() * 12, // 12-24 hours delivery
          4.0 + Math.random() * 1.0, // 4.0-5.0 quality
          3.5 + Math.random() * 1.0, // 3.5-4.5 cost efficiency
          4.0 + Math.random() * 0.8, // 4.0-4.8 communication
          ordersPlaced * (200 + Math.random() * 500), // £200-700 per order
          Math.random() * 0.05, // 0-5% defect rate
          deliveryRate
        ]
      );
      
      currentDate.setDate(currentDate.getDate() + 7); // Weekly data
    }
  }
}

async function generateInventoryMovements(db: any, startDate: Date, endDate: Date) {
  const products = await db.all('SELECT id, name, price FROM products LIMIT 20'); // Sample products
  const movementTypes = ['in', 'out', 'adjustment', 'waste', 'return'];
  const reasons = ['delivery', 'sale', 'count_adjustment', 'expiry', 'customer_return', 'damaged'];
  const staff = ['Alice', 'Bob', 'Carol', 'David'];
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    // Generate 5-15 movements per day
    const movementCount = Math.floor(Math.random() * 10) + 5;
    
    for (let i = 0; i < movementCount; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
      const quantity = Math.floor(Math.random() * 50) + 1;
      
      const moveTime = new Date(currentDate);
      moveTime.setHours(Math.floor(Math.random() * 12) + 6); // 6am-6pm
      
      await db.run(
        `INSERT INTO inventory_movements
         (product_id, movement_type, quantity, unit_cost, total_value, reference_type,
          reason, batch_number, location, staff_member, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          movementType,
          movementType === 'out' || movementType === 'waste' ? -quantity : quantity,
          product.price * 0.6, // Cost price
          product.price * 0.6 * quantity,
          movementType === 'in' ? 'purchase_order' : 'sale',
          reasons[Math.floor(Math.random() * reasons.length)],
          'BATCH' + currentDate.getFullYear() + (currentDate.getMonth() + 1).toString().padStart(2, '0') + Math.floor(Math.random() * 1000),
          'Main Store',
          staff[Math.floor(Math.random() * staff.length)],
          moveTime.toISOString()
        ]
      );
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

async function generateSeasonalTrends(db: any) {
  const products = await db.all('SELECT id, category FROM products LIMIT 15');
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const years = [2023, 2024];
  
  for (const year of years) {
    for (const season of seasons) {
      for (const product of products) {
        const demandMultiplier = getSeasonalMultiplier(product.category, new Date(`${year}-${getSeasonMonth(season)}-01`));
        
        await db.run(
          `INSERT INTO seasonal_trends
           (product_id, category, season, year, demand_multiplier, average_weekly_sales,
            peak_week_sales, low_week_sales, price_elasticity, promotional_effectiveness,
            weather_correlation, holiday_impact)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.id,
            product.category,
            season,
            year,
            demandMultiplier,
            50 * demandMultiplier,
            80 * demandMultiplier,
            20 * demandMultiplier,
            -0.5 + Math.random() * 1.0, // Price elasticity
            0.1 + Math.random() * 0.3, // Promotional effectiveness
            Math.random() * 0.4 - 0.2, // Weather correlation
            season === 'winter' ? 0.2 + Math.random() * 0.3 : Math.random() * 0.1
          ]
        );
      }
    }
  }
}

async function generateCustomerLifetimeValue(db: any, customers: any[]) {
  for (const customer of customers) {
    const daysSinceJoin = Math.floor((new Date().getTime() - customer.joinDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalOrders = Math.floor(daysSinceJoin / 30) + Math.floor(Math.random() * 5); // Roughly monthly orders
    const avgOrderValue = customer.segment === 'premium' ? 25 : customer.segment === 'regular' ? 15 : 10;
    const totalSpent = totalOrders * (avgOrderValue + Math.random() * 10);
    const orderFrequency = totalOrders > 0 ? daysSinceJoin / totalOrders : 0;
    
    await db.run(
      `UPDATE customer_lifetime_value SET
       last_order_date = ?, total_orders = ?, total_spent = ?, average_order_value = ?,
       order_frequency_days = ?, predicted_ltv = ?, churn_risk_score = ?,
       referral_count = ?, satisfaction_score = ?, last_updated = ?
       WHERE user_id = ?`,
      [
        customer.joinDate.toISOString().split('T')[0],
        totalOrders,
        Math.round(totalSpent * 100) / 100,
        Math.round((totalSpent / Math.max(totalOrders, 1)) * 100) / 100,
        Math.round(orderFrequency),
        Math.round(totalSpent * 2.5 * 100) / 100, // Predicted LTV
        orderFrequency > 60 ? 0.8 : orderFrequency > 30 ? 0.4 : 0.1, // Churn risk
        Math.floor(totalOrders * 0.1), // 10% referral rate
        4.0 + Math.random() * 1.0, // Satisfaction
        new Date().toISOString(),
        customer.id
      ]
    );
  }
}

async function generateDemandForecasting(db: any, endDate: Date) {
  const products = await db.all('SELECT id FROM products LIMIT 10');
  const horizons = [7, 14, 30]; // 1 week, 2 weeks, 1 month
  
  for (const product of products) {
    for (const horizon of horizons) {
      const forecastDate = endDate.toISOString().split('T')[0];
      const baseDemand = 10 + Math.random() * 40; // 10-50 units
      const confidence = 0.7 + Math.random() * 0.25; // 70-95% confidence
      
      await db.run(
        `INSERT INTO demand_forecasting
         (product_id, forecast_date, forecast_horizon_days, predicted_demand,
          confidence_interval_lower, confidence_interval_upper, model_accuracy,
          factors_considered, seasonal_component, trend_component, holiday_component,
          weather_component, promotion_component)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          forecastDate,
          horizon,
          Math.round(baseDemand),
          Math.round(baseDemand * 0.8),
          Math.round(baseDemand * 1.2),
          confidence,
          'historical_data,seasonal_patterns,weather,trends',
          Math.random() * 0.3 - 0.15, // Seasonal component
          Math.random() * 0.2 - 0.1, // Trend component
          Math.random() * 0.1, // Holiday component
          Math.random() * 0.1 - 0.05, // Weather component
          Math.random() * 0.15 // Promotion component
        ]
      );
    }
  }
}

function getSeasonalMultiplier(category: string, date: Date): number {
  const month = date.getMonth();
  
  switch (category) {
    case 'coffee':
      return month >= 10 || month <= 2 ? 1.3 : 0.8; // Higher in winter
    case 'bakery_products':
      return month >= 11 || month <= 1 ? 1.4 : 1.0; // Holiday season boost
    case 'dairy':
      return month >= 5 && month <= 8 ? 0.9 : 1.1; // Lower in summer
    case 'deli':
      return month >= 3 && month <= 9 ? 1.2 : 0.9; // Higher in warmer months
    default:
      return 1.0;
  }
}

function getSeasonMonth(season: string): string {
  switch (season) {
    case 'spring': return '03';
    case 'summer': return '06';
    case 'autumn': return '09';
    case 'winter': return '12';
    default: return '01';
  }
}