import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { logger } from './logger';

// Database singleton instance
let db: Database | null = null;

/**
 * Initialize the database connection
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    logger.debug('Database already initialized, returning existing connection');
    return db;
  }
  
  // Smart database path - works for both local Docker Desktop and Railway
  // Check if Docker data directory exists, otherwise use current directory
  const fs = require('fs');
  const dataDir = path.resolve(process.cwd(), 'data');
  const hasDataDir = fs.existsSync(dataDir);
  
  const dbPath = hasDataDir 
    ? path.resolve(dataDir, 'ronis_bakery.db')  // Docker environment
    : path.resolve(process.cwd(), 'ronis_bakery.db');  // Local development
  logger.info('Initializing database connection', { dbPath });
  
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    logger.info('Database connection established successfully', { dbPath });
  } catch (error) {
    logger.error('Failed to establish database connection', { dbPath }, error as Error);
    throw error;
  }
  
  // Create tables if they don't exist
  await db.exec(`
    -- Tenants table for multi-tenant support
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bakery', 'restaurant', 'cafe', 'enterprise', 'individual')),
      subscription_plan TEXT NOT NULL CHECK(subscription_plan IN ('free', 'basic', 'premium', 'enterprise')),
      subscription_status TEXT NOT NULL DEFAULT 'active' CHECK(subscription_status IN ('active', 'inactive', 'suspended', 'cancelled')),
      subscription_start_date TEXT,
      subscription_end_date TEXT,
      max_users INTEGER DEFAULT 10,
      max_products INTEGER DEFAULT 100,
      max_orders_per_month INTEGER DEFAULT 1000,
      settings TEXT, -- JSON field for tenant-specific settings
      domain TEXT, -- Custom domain for white-label
      logo_url TEXT,
      primary_contact_email TEXT NOT NULL,
      billing_email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      postcode TEXT,
      country TEXT DEFAULT 'UK',
      timezone TEXT DEFAULT 'Europe/London',
      currency TEXT DEFAULT 'GBP',
      is_active BOOLEAN DEFAULT 1,
      trial_ends_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      current_stock REAL NOT NULL,
      unit TEXT NOT NULL,
      reorder_point REAL NOT NULL,
      optimal_stock REAL NOT NULL,
      supplier_id INTEGER,
      last_delivery TEXT,
      consumption_rate REAL,
      predicted_stockout TEXT,
      price REAL NOT NULL,
      description TEXT,
      image_url TEXT,
      daily_usage REAL NOT NULL,
      order_quantity REAL NOT NULL,
      lead_time INTEGER NOT NULL,
      lead_time_unit TEXT NOT NULL,
      kosher_certified BOOLEAN,
      storage_temp TEXT,
      shelf_life_days INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      lead_time INTEGER NOT NULL,
      mcp_id TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      kosher_certified BOOLEAN,
      delivery_schedule TEXT,
      minimum_order REAL,
      is_global BOOLEAN DEFAULT 0, -- Global suppliers available to all tenants
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      order_date TEXT NOT NULL,
      supplier_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      expected_delivery TEXT,
      total_cost REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS consumption_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS delivery_drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      vehicle_registration TEXT,
      license_number TEXT,
      supplier_id INTEGER,
      is_global BOOLEAN DEFAULT 0, -- Global drivers available to all tenants
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    
    CREATE TABLE IF NOT EXISTS delivery_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'assigned',
      estimated_arrival TEXT,
      actual_departure TEXT,
      actual_arrival TEXT,
      current_latitude REAL,
      current_longitude REAL,
      last_location_update TEXT,
      delivery_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id)
    );
    
    CREATE TABLE IF NOT EXISTS supplier_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'manager',
      is_active BOOLEAN DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    
    CREATE TABLE IF NOT EXISTS order_api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      api_endpoint TEXT NOT NULL,
      request_payload TEXT,
      response_payload TEXT,
      status_code INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id)
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK(role IN ('client', 'supplier', 'driver', 'admin', 'tenant_admin', 'tenant_manager')),
      supplier_id INTEGER,
      is_global BOOLEAN DEFAULT 0, -- Global users (super admin, support)
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      UNIQUE(tenant_id, email) -- Email must be unique within tenant
    );
    
    CREATE TABLE IF NOT EXISTS client_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      address_label TEXT NOT NULL,
      street_address TEXT NOT NULL,
      city TEXT NOT NULL,
      postcode TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      is_default BOOLEAN DEFAULT 0,
      delivery_instructions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS client_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      order_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount REAL NOT NULL,
      delivery_fee REAL DEFAULT 2.50,
      delivery_address_id INTEGER NOT NULL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      estimated_delivery TEXT,
      actual_delivery TEXT,
      special_instructions TEXT,
      rating INTEGER,
      feedback TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (delivery_address_id) REFERENCES client_addresses(id),
      UNIQUE(tenant_id, order_number) -- Order number must be unique within tenant
    );
    
    CREATE TABLE IF NOT EXISTS client_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      special_instructions TEXT,
      FOREIGN KEY (order_id) REFERENCES client_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS delivery_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_order_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      supplier_order_id INTEGER,
      status TEXT NOT NULL DEFAULT 'assigned',
      pickup_time TEXT,
      pickup_latitude REAL,
      pickup_longitude REAL,
      delivery_latitude REAL,
      delivery_longitude REAL,
      current_latitude REAL,
      current_longitude REAL,
      estimated_arrival TEXT,
      actual_arrival TEXT,
      distance_km REAL,
      duration_minutes INTEGER,
      delivery_proof_url TEXT,
      driver_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_order_id) REFERENCES client_orders(id),
      FOREIGN KEY (driver_id) REFERENCES users(id),
      FOREIGN KEY (supplier_order_id) REFERENCES purchase_orders(id)
    );
    
    CREATE TABLE IF NOT EXISTS delivery_route_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed_kmh REAL,
      heading REAL,
      accuracy REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES delivery_assignments(id)
    );
    
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      order_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      review_text TEXT,
      is_verified_purchase BOOLEAN DEFAULT 1,
      helpful_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES client_orders(id)
    );
    
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      read_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    -- Historical data tables for analytics and trends
    CREATE TABLE IF NOT EXISTS daily_sales_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_orders INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      total_customers INTEGER DEFAULT 0,
      new_customers INTEGER DEFAULT 0,
      average_order_value REAL DEFAULT 0,
      delivery_completion_rate REAL DEFAULT 0,
      customer_satisfaction_avg REAL DEFAULT 0,
      peak_hour TEXT,
      top_product_id INTEGER,
      weather_condition TEXT,
      day_of_week TEXT,
      is_holiday BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (top_product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS monthly_business_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      total_revenue REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      unique_customers INTEGER DEFAULT 0,
      customer_retention_rate REAL DEFAULT 0,
      average_order_value REAL DEFAULT 0,
      gross_margin_percentage REAL DEFAULT 0,
      operating_costs REAL DEFAULT 0,
      net_profit REAL DEFAULT 0,
      inventory_turnover REAL DEFAULT 0,
      supplier_performance_avg REAL DEFAULT 0,
      delivery_success_rate REAL DEFAULT 0,
      customer_satisfaction_avg REAL DEFAULT 0,
      marketing_spend REAL DEFAULT 0,
      staff_hours REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, month)
    );
    
    CREATE TABLE IF NOT EXISTS product_performance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      units_sold INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      cost_of_goods REAL DEFAULT 0,
      gross_profit REAL DEFAULT 0,
      stock_level_start INTEGER DEFAULT 0,
      stock_level_end INTEGER DEFAULT 0,
      restock_count INTEGER DEFAULT 0,
      out_of_stock_hours INTEGER DEFAULT 0,
      average_rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      return_count INTEGER DEFAULT 0,
      waste_units INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(product_id, date)
    );
    
    CREATE TABLE IF NOT EXISTS customer_behavior_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      session_count INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      time_spent_minutes INTEGER DEFAULT 0,
      products_viewed INTEGER DEFAULT 0,
      cart_additions INTEGER DEFAULT 0,
      cart_abandonments INTEGER DEFAULT 0,
      orders_placed INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      preferred_categories TEXT,
      peak_activity_hour INTEGER,
      device_type TEXT,
      referral_source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    );
    
    CREATE TABLE IF NOT EXISTS supplier_performance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      orders_placed INTEGER DEFAULT 0,
      orders_delivered INTEGER DEFAULT 0,
      orders_delayed INTEGER DEFAULT 0,
      orders_cancelled INTEGER DEFAULT 0,
      average_delivery_time_hours REAL DEFAULT 0,
      quality_score REAL DEFAULT 0,
      cost_efficiency_score REAL DEFAULT 0,
      communication_score REAL DEFAULT 0,
      total_order_value REAL DEFAULT 0,
      defect_rate_percentage REAL DEFAULT 0,
      on_time_delivery_rate REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      UNIQUE(supplier_id, date)
    );
    
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('in', 'out', 'adjustment', 'waste', 'return')),
      quantity REAL NOT NULL,
      unit_cost REAL,
      total_value REAL,
      reference_type TEXT,
      reference_id INTEGER,
      reason TEXT,
      batch_number TEXT,
      expiry_date TEXT,
      location TEXT,
      staff_member TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    
    CREATE TABLE IF NOT EXISTS seasonal_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      category TEXT,
      season TEXT NOT NULL CHECK(season IN ('spring', 'summer', 'autumn', 'winter')),
      year INTEGER NOT NULL,
      demand_multiplier REAL DEFAULT 1.0,
      average_weekly_sales REAL DEFAULT 0,
      peak_week_sales REAL DEFAULT 0,
      low_week_sales REAL DEFAULT 0,
      price_elasticity REAL DEFAULT 0,
      promotional_effectiveness REAL DEFAULT 0,
      weather_correlation REAL DEFAULT 0,
      holiday_impact REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(product_id, category, season, year)
    );
    
    CREATE TABLE IF NOT EXISTS customer_lifetime_value (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      first_order_date TEXT NOT NULL,
      last_order_date TEXT,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      average_order_value REAL DEFAULT 0,
      order_frequency_days REAL DEFAULT 0,
      predicted_ltv REAL DEFAULT 0,
      customer_segment TEXT,
      churn_risk_score REAL DEFAULT 0,
      acquisition_cost REAL DEFAULT 0,
      acquisition_channel TEXT,
      referral_count INTEGER DEFAULT 0,
      support_tickets INTEGER DEFAULT 0,
      satisfaction_score REAL DEFAULT 0,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id)
    );
    
    CREATE TABLE IF NOT EXISTS demand_forecasting (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      forecast_date TEXT NOT NULL,
      forecast_horizon_days INTEGER NOT NULL,
      predicted_demand REAL NOT NULL,
      confidence_interval_lower REAL,
      confidence_interval_upper REAL,
      model_accuracy REAL,
      factors_considered TEXT,
      seasonal_component REAL DEFAULT 0,
      trend_component REAL DEFAULT 0,
      holiday_component REAL DEFAULT 0,
      weather_component REAL DEFAULT 0,
      promotion_component REAL DEFAULT 0,
      actual_demand REAL,
      forecast_error REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(product_id, forecast_date, forecast_horizon_days)
    );

    -- Junction tables for many-to-many relationships
    CREATE TABLE IF NOT EXISTS tenant_suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      preferred_supplier BOOLEAN DEFAULT 0,
      contract_start_date TEXT,
      contract_end_date TEXT,
      payment_terms TEXT,
      discount_percentage REAL DEFAULT 0,
      minimum_order_override REAL,
      custom_delivery_schedule TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      UNIQUE(tenant_id, supplier_id)
    );

    CREATE TABLE IF NOT EXISTS tenant_drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      hourly_rate REAL,
      commission_percentage REAL DEFAULT 0,
      vehicle_assigned TEXT,
      territory TEXT,
      max_deliveries_per_day INTEGER DEFAULT 10,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id),
      UNIQUE(tenant_id, driver_id)
    );

    -- Tenant-specific analytics and performance tables
    CREATE TABLE IF NOT EXISTS tenant_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_orders INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      total_customers INTEGER DEFAULT 0,
      new_customers INTEGER DEFAULT 0,
      average_order_value REAL DEFAULT 0,
      delivery_completion_rate REAL DEFAULT 0,
      customer_satisfaction_avg REAL DEFAULT 0,
      peak_hour TEXT,
      top_product_id INTEGER,
      active_users INTEGER DEFAULT 0,
      storage_used_gb REAL DEFAULT 0,
      api_calls_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (top_product_id) REFERENCES products(id),
      UNIQUE(tenant_id, date)
    );

    CREATE TABLE IF NOT EXISTS tenant_subscriptions_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      old_plan TEXT,
      new_plan TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      change_reason TEXT,
      effective_date TEXT NOT NULL,
      changed_by_user_id INTEGER,
      billing_amount REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
    );

    -- Performance indexes for multi-tenant queries
    CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON purchase_orders(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_status ON purchase_orders(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_client_orders_tenant_id ON client_orders(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_client_orders_tenant_status ON client_orders(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_client_orders_tenant_date ON client_orders(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
    CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
    CREATE INDEX IF NOT EXISTS idx_consumption_records_tenant_id ON consumption_records(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_consumption_records_tenant_product ON consumption_records(tenant_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_suppliers_tenant_id ON tenant_suppliers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_drivers_tenant_id ON tenant_drivers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_analytics_tenant_date ON tenant_analytics(tenant_id, date);
    CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
    CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(subscription_status);
    CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(type);

    -- Email logs for tracking agent email notifications
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      email_type TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'failed', 'pending')),
      mailtrap_message_id TEXT,
      error_message TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    -- Tool usage audit table for agent interactions
    CREATE TABLE IF NOT EXISTS tool_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      tool_name TEXT NOT NULL,
      parameters TEXT,
      result TEXT,
      execution_time_ms INTEGER,
      success BOOLEAN DEFAULT 1,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON email_logs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
    CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
    
    CREATE INDEX IF NOT EXISTS idx_tool_usage_tenant_user ON tool_usage_logs(tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_name ON tool_usage_logs(tool_name);
    CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage_logs(created_at);
  `);
  
  return db;
}

/**
 * Get the database connection
 */
export async function getDb(): Promise<Database> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
