// Database model types

export interface Product {
  id: number;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  reorder_point: number;
  optimal_stock: number;
  supplier_id: number;
  last_delivery: string;
  consumption_rate: number;
  predicted_stockout: string;
  price: number;
  description?: string;
  image_url?: string;
  daily_usage: number;
  order_quantity: number;
  lead_time: number;
  lead_time_unit: 'daily' | 'days' | 'weekly' | 'monthly';
  kosher_certified?: boolean;
  storage_temp?: 'frozen' | 'refrigerated' | 'room_temp';
  shelf_life_days?: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  lead_time: number;
  mcp_id: string;
  email?: string;
  phone?: string;
  address?: string;
  kosher_certified?: boolean;
  delivery_schedule?: string;
  minimum_order?: number;
}

export interface PurchaseOrder {
  id: number;
  order_date: string;
  supplier_id: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  expected_delivery?: string;
  total_cost?: number;
  notes?: string;
  supplier?: Supplier;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price?: number;
  product?: Product;
}

export interface ConsumptionRecord {
  id: number;
  record_date: string;
  product_id: number;
  quantity: number;
  notes?: string;
  product?: Product;
}

// Enhanced types with supplier and stock status info
export interface ProductWithSupplier extends Product {
  supplier: Supplier;
  stock_status: 'ok' | 'low' | 'critical';
  days_until_stockout: number;
}

export interface StockAlert {
  product: ProductWithSupplier;
  message: string;
  priority: 'high' | 'medium' | 'low';
  recommended_order_quantity: number;
}

export interface ConsumptionTrend {
  product_id: number;
  product_name: string;
  avg_daily_consumption: number;
  trend_percentage: number; // Positive for increasing, negative for decreasing
  trend_direction: 'increasing' | 'decreasing' | 'stable';
}
