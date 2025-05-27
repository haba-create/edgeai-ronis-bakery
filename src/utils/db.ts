import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Database singleton instance
let db: Database | null = null;

/**
 * Initialize the database connection
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;
  
  const dbPath = path.resolve(process.cwd(), 'ronis_bakery.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      minimum_order REAL
    );
    
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_date TEXT NOT NULL,
      supplier_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      expected_delivery TEXT,
      total_cost REAL,
      notes TEXT,
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
      record_date TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      notes TEXT,
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
      is_active BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
