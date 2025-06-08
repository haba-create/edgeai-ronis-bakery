# Multi-Tenant Database Schema Implementation

This document describes the multi-tenant architecture implementation for Roni's Bakery platform.

## Overview

The database has been upgraded from a single-tenant to a multi-tenant architecture, allowing multiple bakeries, restaurants, cafes, and other food businesses to use the same platform while maintaining complete data isolation.

## Core Features

### 1. Tenant Management
- Complete tenant isolation with data segregation
- Flexible subscription plans (free, basic, premium, enterprise)
- Configurable limits per tenant (users, products, orders)
- White-label support with custom domains
- Tenant-specific settings and branding

### 2. Subscription Management
- Multiple subscription tiers with different limits
- Automatic limit enforcement
- Subscription status tracking (active, inactive, suspended, cancelled)
- Trial period support
- Subscription change history and audit trail

### 3. User Management
- Multi-tenant user accounts with tenant-scoped email uniqueness
- Role-based access control (client, supplier, driver, admin, tenant_admin, tenant_manager)
- Global users for platform administration
- Tenant-specific user limits

### 4. Resource Sharing
- Global suppliers available to all tenants
- Tenant-specific supplier relationships with custom terms
- Global delivery drivers with tenant-specific assignments
- Flexible many-to-many relationships between tenants and resources

## Database Schema Changes

### New Tables

#### `tenants`
Primary table for tenant management with subscription details, limits, and configuration.

#### `tenant_suppliers`
Junction table managing relationships between tenants and suppliers with custom terms.

#### `tenant_drivers`
Junction table managing relationships between tenants and delivery drivers.

#### `tenant_analytics`
Tenant-specific analytics and performance metrics.

#### `tenant_subscriptions_log`
Audit trail for subscription changes and billing history.

### Modified Tables

All core business tables now include:
- `tenant_id` column for data isolation
- Proper foreign key constraints to tenants table
- Unique constraints scoped to tenant where applicable
- Audit fields (`created_at`, `updated_at`) where missing

### Tables with Tenant ID Added:
- `products`
- `purchase_orders`
- `consumption_records`
- `users`
- `client_orders`

### Global Resource Tables:
- `suppliers` - Can be global or tenant-specific
- `delivery_drivers` - Can be global or tenant-specific

## Performance Optimizations

### Indexes Created:
- `idx_products_tenant_id` - Fast product queries by tenant
- `idx_products_tenant_category` - Category filtering within tenant
- `idx_purchase_orders_tenant_id` - Purchase order queries by tenant
- `idx_purchase_orders_tenant_status` - Status filtering within tenant
- `idx_client_orders_tenant_id` - Client order queries by tenant
- `idx_client_orders_tenant_status` - Order status filtering
- `idx_client_orders_tenant_date` - Date-based order queries
- `idx_users_tenant_id` - User queries by tenant
- `idx_users_tenant_email` - Email lookups within tenant
- `idx_users_tenant_role` - Role-based user filtering
- And more...

## Migration Process

### Automatic Migration
Run the migration script to convert existing single-tenant data:

```typescript
import { migrateToMultiTenant } from './src/utils/migrate-to-multitenant';

const result = await migrateToMultiTenant();
console.log(result);
```

### Migration Features:
- Creates a default "Legacy Tenant" for existing data
- Migrates all existing records to the default tenant
- Creates tenant-supplier and tenant-driver relationships
- Adds missing audit fields
- Ensures data integrity and uniqueness constraints
- Transaction-based rollback on failure

### Validation
Validate migration success and data integrity:

```typescript
import { validateMultiTenantData } from './src/utils/migrate-to-multitenant';

const validation = await validateMultiTenantData();
console.log(validation);
```

## Utility Functions

### Tenant Management
```typescript
import { 
  getTenantById, 
  getTenantBySlug, 
  createTenant,
  updateTenantSubscription 
} from './src/utils/tenant-utils';

// Get tenant by ID
const tenant = await getTenantById(1);

// Create new tenant
const tenantId = await createTenant({
  name: "Joe's Bakery",
  slug: "joes-bakery",
  type: "bakery",
  subscription_plan: "basic",
  primary_contact_email: "joe@joesbakery.com"
});
```

### Limit Management
```typescript
import { 
  getTenantLimits, 
  canAddUser, 
  canAddProduct, 
  canPlaceOrder 
} from './src/utils/tenant-utils';

// Check tenant limits
const limits = await getTenantLimits(tenantId);
console.log(`Users: ${limits.currentUsers}/${limits.maxUsers} (${limits.usersPercentage}%)`);

// Check if actions are allowed
const canAdd = await canAddUser(tenantId);
if (!canAdd) {
  throw new Error('User limit reached');
}
```

### Resource Assignment
```typescript
import { 
  assignSupplierToTenant, 
  assignDriverToTenant,
  getTenantSuppliers,
  getTenantDrivers 
} from './src/utils/tenant-utils';

// Assign supplier with custom terms
await assignSupplierToTenant(tenantId, supplierId, {
  preferred: true,
  discountPercentage: 5,
  paymentTerms: "Net 30"
});

// Get tenant's available suppliers
const suppliers = await getTenantSuppliers(tenantId);
```

## Subscription Plans

### Free Tier
- 3 users
- 50 products
- 100 orders/month

### Basic Tier
- 10 users
- 200 products
- 500 orders/month

### Premium Tier
- 50 users
- 1,000 products
- 2,000 orders/month

### Enterprise Tier
- 1,000 users
- 10,000 products
- 100,000 orders/month

## Security Considerations

### Data Isolation
- All queries must include tenant_id filtering
- Foreign key constraints prevent cross-tenant data access
- Unique constraints are scoped to tenant level

### Access Control
- Role-based permissions within each tenant
- Global users for platform administration
- Tenant administrators can only manage their own tenant

### Best Practices
1. Always validate tenant_id in API calls
2. Use tenant-scoped queries for all data operations
3. Implement middleware to automatically add tenant context
4. Regular validation of data integrity
5. Monitor subscription limits and usage

## White-Label Support

### Custom Domains
- Each tenant can have a custom domain
- Domain-based tenant resolution
- Tenant-specific branding and logos

### Customization
- Tenant-specific settings stored as JSON
- Custom currency and timezone support
- Localization support per tenant

## Analytics and Reporting

### Tenant Analytics
- Daily metrics calculation and storage
- Tenant-specific performance tracking
- Subscription usage monitoring

### Platform Analytics
- Cross-tenant analytics for platform administrators
- Subscription revenue tracking
- Usage pattern analysis

## Backup and Recovery

### Tenant-Specific Backups
- Export data for individual tenants
- Tenant data restoration procedures
- Migration between environments

### Platform Backups
- Full database backups with multi-tenant data
- Point-in-time recovery procedures
- Disaster recovery planning

## Development Guidelines

### Query Patterns
Always include tenant_id in queries:

```sql
-- Good
SELECT * FROM products WHERE tenant_id = ? AND category = ?;

-- Bad
SELECT * FROM products WHERE category = ?;
```

### API Design
Include tenant context in all endpoints:

```typescript
app.get('/api/tenants/:tenantId/products', async (req, res) => {
  const { tenantId } = req.params;
  // Validate user has access to this tenant
  const products = await db.all(
    'SELECT * FROM products WHERE tenant_id = ?', 
    [tenantId]
  );
  res.json(products);
});
```

### Error Handling
- Tenant not found errors
- Subscription limit exceeded errors
- Cross-tenant access prevention

## Future Enhancements

### Planned Features
1. Advanced analytics dashboard
2. Tenant-to-tenant marketplace
3. API rate limiting per tenant
4. Advanced billing and invoicing
5. Tenant data export/import tools
6. Multi-region deployment support

### Scalability Considerations
1. Database sharding by tenant
2. Separate databases per tenant option
3. Caching strategies for tenant data
4. CDN configuration for white-label domains

This multi-tenant implementation provides a robust foundation for scaling the platform to serve multiple food businesses while maintaining data security, performance, and flexibility.