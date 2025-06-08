/**
 * TypeScript definitions for OpenAI Agents SDK tools
 * Provides tenant-aware database access and role-based tool definitions
 */

import { Database } from 'sqlite';

// Base interfaces for agent tools and context
export interface AgentContext {
  tenantId: number;
  userId: number;
  userRole: 'client' | 'supplier' | 'driver' | 'admin' | 'tenant_admin' | 'tenant_manager';
  db: Database;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  function: (args: any, context: AgentContext) => Promise<any>;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Tenant and user related types
export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  type: 'bakery' | 'restaurant' | 'cafe' | 'enterprise' | 'individual';
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  timezone: string;
  currency: string;
}

export interface UserInfo {
  id: number;
  tenant_id: number;
  email: string;
  full_name: string;
  role: 'client' | 'supplier' | 'driver' | 'admin' | 'tenant_admin' | 'tenant_manager';
  supplier_id?: number;
  phone?: string;
  is_active: boolean;
}

// Product related types
export interface Product {
  id: number;
  tenant_id: number;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  reorder_point: number;
  optimal_stock: number;
  supplier_id?: number;
  price: number;
  description?: string;
  daily_usage: number;
  order_quantity: number;
  lead_time: number;
  lead_time_unit: string;
  predicted_stockout?: string;
}

// Order related types
export interface PurchaseOrder {
  id: number;
  tenant_id: number;
  order_date: string;
  supplier_id: number;
  status: 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
  expected_delivery?: string;
  total_cost?: number;
  notes?: string;
}

export interface ClientOrder {
  id: number;
  tenant_id: number;
  user_id: number;
  order_number: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_fee: number;
  delivery_address_id: number;
  estimated_delivery?: string;
  special_instructions?: string;
}

// Delivery related types
export interface DeliveryAssignment {
  id: number;
  client_order_id: number;
  driver_id: number;
  status: 'assigned' | 'pickup' | 'in_transit' | 'delivered' | 'failed';
  pickup_time?: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  current_latitude?: number;
  current_longitude?: number;
  distance_km?: number;
  duration_minutes?: number;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  email?: string;
  vehicle_registration?: string;
  is_active: boolean;
}

// Supplier related types
export interface Supplier {
  id: number;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  lead_time: number;
  minimum_order?: number;
  is_global: boolean;
}

// Analytics related types
export interface InventoryAnalytics {
  total_products: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
  turnover_rate: number;
  top_selling_products: Array<{
    product_name: string;
    units_sold: number;
    revenue: number;
  }>;
}

export interface OrderAnalytics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  completion_rate: number;
  peak_hours: Array<{
    hour: number;
    order_count: number;
  }>;
}

export interface DeliveryAnalytics {
  total_deliveries: number;
  on_time_rate: number;
  average_delivery_time: number;
  driver_performance: Array<{
    driver_name: string;
    deliveries_completed: number;
    on_time_rate: number;
    average_time: number;
  }>;
}

// Limit operation types for tenant validation
export type LimitOperation = 'add_user' | 'add_product' | 'place_order';

// Tool parameter types for validation
export interface InventoryQueryParams {
  category?: string;
  low_stock_only?: boolean;
  include_predictions?: boolean;
  limit?: number;
}

export interface OrderCreationParams {
  supplier_id: number;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
  expected_delivery?: string;
  notes?: string;
}

export interface DeliveryStatusParams {
  order_id?: number;
  driver_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface AnalyticsParams {
  start_date: string;
  end_date: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  category?: string;
}

// Navigation and location types
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  origin: LocationCoordinates;
  destination: LocationCoordinates;
  distance_km: number;
  duration_minutes: number;
  waypoints?: LocationCoordinates[];
}

// Earnings and performance types
export interface DriverEarnings {
  driver_id: number;
  period_start: string;
  period_end: string;
  total_deliveries: number;
  total_earnings: number;
  base_pay: number;
  tips: number;
  bonuses: number;
  deductions: number;
}

export interface PerformanceMetrics {
  on_time_delivery_rate: number;
  customer_rating: number;
  total_distance_km: number;
  fuel_efficiency: number;
  earnings_per_hour: number;
}

// System administration types
export interface SystemStatus {
  database_status: 'healthy' | 'warning' | 'critical';
  api_status: 'operational' | 'degraded' | 'down';
  active_users: number;
  total_orders_today: number;
  system_load: number;
  storage_usage: number;
}

export interface TenantAdminStats {
  tenant_id: number;
  user_count: number;
  product_count: number;
  order_count_month: number;
  revenue_month: number;
  subscription_status: string;
  usage_limits: {
    users: { current: number; limit: number; percentage: number };
    products: { current: number; limit: number; percentage: number };
    orders: { current: number; limit: number; percentage: number };
  };
}