import { Database } from 'sqlite';
import { getDb } from './db';

/**
 * Utility functions for multi-tenant operations
 */

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  type: 'bakery' | 'restaurant' | 'cafe' | 'enterprise' | 'individual';
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  subscription_start_date?: string;
  subscription_end_date?: string;
  max_users: number;
  max_products: number;
  max_orders_per_month: number;
  settings?: string; // JSON
  domain?: string;
  logo_url?: string;
  primary_contact_email: string;
  billing_email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantLimits {
  maxUsers: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
  currentUsers: number;
  currentProducts: number;
  currentMonthOrders: number;
  usersPercentage: number;
  productsPercentage: number;
  ordersPercentage: number;
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: number): Promise<Tenant | null> {
  const db = await getDb();
  const result = await db.get('SELECT * FROM tenants WHERE id = ? AND is_active = 1', [tenantId]);
  return result || null;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = await getDb();
  const result = await db.get('SELECT * FROM tenants WHERE slug = ? AND is_active = 1', [slug]);
  return result || null;
}

/**
 * Get tenant by domain (for white-label support)
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const db = await getDb();
  const result = await db.get('SELECT * FROM tenants WHERE domain = ? AND is_active = 1', [domain]);
  return result || null;
}

/**
 * Create a new tenant
 */
export async function createTenant(tenantData: Partial<Tenant>): Promise<number> {
  const db = await getDb();
  
  const result = await db.run(`
    INSERT INTO tenants (
      name, slug, type, subscription_plan, subscription_status,
      max_users, max_products, max_orders_per_month,
      primary_contact_email, billing_email, phone, address, city, postcode,
      country, timezone, currency, settings, domain, logo_url,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    tenantData.name,
    tenantData.slug,
    tenantData.type || 'bakery',
    tenantData.subscription_plan || 'free',
    tenantData.subscription_status || 'active',
    tenantData.max_users || 10,
    tenantData.max_products || 100,
    tenantData.max_orders_per_month || 1000,
    tenantData.primary_contact_email,
    tenantData.billing_email,
    tenantData.phone,
    tenantData.address,
    tenantData.city,
    tenantData.postcode,
    tenantData.country || 'UK',
    tenantData.timezone || 'Europe/London',
    tenantData.currency || 'GBP',
    tenantData.settings,
    tenantData.domain,
    tenantData.logo_url
  ]);

  return result.lastID as number;
}

/**
 * Update tenant subscription
 */
export async function updateTenantSubscription(
  tenantId: number,
  subscriptionPlan: string,
  subscriptionStatus: string,
  userId?: number
): Promise<void> {
  const db = await getDb();
  
  // Get current tenant data
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Update subscription limits based on plan
  const limits = getSubscriptionLimits(subscriptionPlan);
  
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Update tenant
    await db.run(`
      UPDATE tenants SET 
        subscription_plan = ?,
        subscription_status = ?,
        max_users = ?,
        max_products = ?,
        max_orders_per_month = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [subscriptionPlan, subscriptionStatus, limits.maxUsers, limits.maxProducts, limits.maxOrdersPerMonth, tenantId]);

    // Log the change
    await db.run(`
      INSERT INTO tenant_subscriptions_log (
        tenant_id, old_plan, new_plan, old_status, new_status,
        effective_date, changed_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    `, [tenantId, tenant.subscription_plan, subscriptionPlan, tenant.subscription_status, subscriptionStatus, userId]);

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/**
 * Get subscription limits by plan
 */
function getSubscriptionLimits(plan: string): { maxUsers: number; maxProducts: number; maxOrdersPerMonth: number } {
  switch (plan) {
    case 'free':
      return { maxUsers: 3, maxProducts: 50, maxOrdersPerMonth: 100 };
    case 'basic':
      return { maxUsers: 10, maxProducts: 200, maxOrdersPerMonth: 500 };
    case 'premium':
      return { maxUsers: 50, maxProducts: 1000, maxOrdersPerMonth: 2000 };
    case 'enterprise':
      return { maxUsers: 1000, maxProducts: 10000, maxOrdersPerMonth: 100000 };
    default:
      return { maxUsers: 3, maxProducts: 50, maxOrdersPerMonth: 100 };
  }
}

/**
 * Check tenant limits and usage
 */
export async function getTenantLimits(tenantId: number): Promise<TenantLimits> {
  const db = await getDb();
  
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get current usage
  const currentUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND is_active = 1', [tenantId]);
  const currentProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE tenant_id = ?', [tenantId]);
  
  // Get current month orders
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthOrders = await db.get(`
    SELECT COUNT(*) as count FROM client_orders 
    WHERE tenant_id = ? AND DATE(created_at) >= ?
  `, [tenantId, firstDayOfMonth]);

  return {
    maxUsers: tenant.max_users,
    maxProducts: tenant.max_products,
    maxOrdersPerMonth: tenant.max_orders_per_month,
    currentUsers: currentUsers.count,
    currentProducts: currentProducts.count,
    currentMonthOrders: currentMonthOrders.count,
    usersPercentage: Math.round((currentUsers.count / tenant.max_users) * 100),
    productsPercentage: Math.round((currentProducts.count / tenant.max_products) * 100),
    ordersPercentage: Math.round((currentMonthOrders.count / tenant.max_orders_per_month) * 100)
  };
}

/**
 * Check if tenant can add more users
 */
export async function canAddUser(tenantId: number): Promise<boolean> {
  const limits = await getTenantLimits(tenantId);
  return limits.currentUsers < limits.maxUsers;
}

/**
 * Check if tenant can add more products
 */
export async function canAddProduct(tenantId: number): Promise<boolean> {
  const limits = await getTenantLimits(tenantId);
  return limits.currentProducts < limits.maxProducts;
}

/**
 * Check if tenant can place more orders this month
 */
export async function canPlaceOrder(tenantId: number): Promise<boolean> {
  const limits = await getTenantLimits(tenantId);
  return limits.currentMonthOrders < limits.maxOrdersPerMonth;
}

/**
 * Get tenant's suppliers (including global suppliers)
 */
export async function getTenantSuppliers(tenantId: number): Promise<any[]> {
  const db = await getDb();
  
  return await db.all(`
    SELECT s.*, ts.is_active as tenant_active, ts.preferred_supplier, 
           ts.discount_percentage, ts.minimum_order_override, ts.payment_terms
    FROM suppliers s
    LEFT JOIN tenant_suppliers ts ON s.id = ts.supplier_id AND ts.tenant_id = ?
    WHERE s.is_global = 1 OR ts.tenant_id = ?
    ORDER BY ts.preferred_supplier DESC, s.name
  `, [tenantId, tenantId]);
}

/**
 * Get tenant's drivers (including global drivers)
 */
export async function getTenantDrivers(tenantId: number): Promise<any[]> {
  const db = await getDb();
  
  return await db.all(`
    SELECT d.*, td.is_active as tenant_active, td.hourly_rate, 
           td.commission_percentage, td.vehicle_assigned, td.territory
    FROM delivery_drivers d
    LEFT JOIN tenant_drivers td ON d.id = td.driver_id AND td.tenant_id = ?
    WHERE d.is_global = 1 OR td.tenant_id = ?
    ORDER BY d.name
  `, [tenantId, tenantId]);
}

/**
 * Assign supplier to tenant
 */
export async function assignSupplierToTenant(
  tenantId: number, 
  supplierId: number, 
  options: {
    preferred?: boolean;
    discountPercentage?: number;
    minimumOrderOverride?: number;
    paymentTerms?: string;
  } = {}
): Promise<void> {
  const db = await getDb();
  
  await db.run(`
    INSERT OR REPLACE INTO tenant_suppliers (
      tenant_id, supplier_id, is_active, preferred_supplier,
      discount_percentage, minimum_order_override, payment_terms,
      created_at, updated_at
    ) VALUES (?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    tenantId, supplierId, options.preferred || false,
    options.discountPercentage || 0, options.minimumOrderOverride,
    options.paymentTerms
  ]);
}

/**
 * Assign driver to tenant
 */
export async function assignDriverToTenant(
  tenantId: number, 
  driverId: number, 
  options: {
    hourlyRate?: number;
    commissionPercentage?: number;
    vehicleAssigned?: string;
    territory?: string;
  } = {}
): Promise<void> {
  const db = await getDb();
  
  await db.run(`
    INSERT OR REPLACE INTO tenant_drivers (
      tenant_id, driver_id, is_active, hourly_rate,
      commission_percentage, vehicle_assigned, territory,
      created_at, updated_at
    ) VALUES (?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [
    tenantId, driverId, options.hourlyRate,
    options.commissionPercentage || 0, options.vehicleAssigned,
    options.territory
  ]);
}

/**
 * Get tenant analytics for a specific date range
 */
export async function getTenantAnalytics(
  tenantId: number, 
  startDate: string, 
  endDate: string
): Promise<any[]> {
  const db = await getDb();
  
  return await db.all(`
    SELECT * FROM tenant_analytics 
    WHERE tenant_id = ? AND date BETWEEN ? AND ?
    ORDER BY date DESC
  `, [tenantId, startDate, endDate]);
}

/**
 * Update tenant analytics for a specific date
 */
export async function updateTenantAnalytics(tenantId: number, date: string): Promise<void> {
  const db = await getDb();
  
  // Calculate analytics for the day
  const analytics = await db.get(`
    SELECT 
      COUNT(DISTINCT co.id) as total_orders,
      COALESCE(SUM(co.total_amount), 0) as total_revenue,
      COUNT(DISTINCT co.user_id) as total_customers,
      COALESCE(AVG(co.total_amount), 0) as average_order_value,
      COALESCE(AVG(co.rating), 0) as customer_satisfaction_avg
    FROM client_orders co
    WHERE co.tenant_id = ? AND DATE(co.created_at) = ?
  `, [tenantId, date]);

  const activeUsers = await db.get(`
    SELECT COUNT(*) as count FROM users 
    WHERE tenant_id = ? AND is_active = 1
  `, [tenantId]);

  await db.run(`
    INSERT OR REPLACE INTO tenant_analytics (
      tenant_id, date, total_orders, total_revenue, total_customers,
      average_order_value, customer_satisfaction_avg, active_users,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    tenantId, date, analytics.total_orders, analytics.total_revenue,
    analytics.total_customers, analytics.average_order_value,
    analytics.customer_satisfaction_avg, activeUsers.count
  ]);
}

/**
 * Generate unique slug for tenant
 */
export async function generateTenantSlug(baseName: string): Promise<string> {
  const db = await getDb();
  
  let slug = baseName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  let counter = 1;
  let finalSlug = slug;
  
  while (true) {
    const existing = await db.get('SELECT id FROM tenants WHERE slug = ?', [finalSlug]);
    if (!existing) break;
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
}