import { Database } from 'sqlite';
import { getDb } from './db';

/**
 * Migration script to convert existing single-tenant data to multi-tenant structure
 * This script should be run once when upgrading from single-tenant to multi-tenant architecture
 */

export interface MigrationResult {
  success: boolean;
  message: string;
  errors: string[];
  warnings: string[];
}

/**
 * Create a default tenant for existing data
 */
async function createDefaultTenant(db: Database): Promise<number> {
  const result = await db.run(`
    INSERT INTO tenants (
      name, slug, type, subscription_plan, subscription_status,
      max_users, max_products, max_orders_per_month,
      primary_contact_email, created_at, updated_at
    ) VALUES (
      'Legacy Tenant',
      'legacy-tenant',
      'bakery',
      'enterprise',
      'active',
      1000,
      10000,
      100000,
      'admin@legacy-tenant.com',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `);
  
  return result.lastID as number;
}

/**
 * Migrate existing data to multi-tenant structure
 */
export async function migrateToMultiTenant(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    errors: [],
    warnings: []
  };

  try {
    const db = await getDb();
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    // Check if migration has already been run
    const existingTenants = await db.get('SELECT COUNT(*) as count FROM tenants');
    if (existingTenants.count > 0) {
      result.warnings.push('Migration appears to have already been run (tenants table has data)');
      await db.run('ROLLBACK');
      result.success = true;
      result.message = 'Migration skipped - already completed';
      return result;
    }

    // Create default tenant
    const defaultTenantId = await createDefaultTenant(db);
    result.warnings.push(`Created default tenant with ID: ${defaultTenantId}`);

    // Migrate products table
    const productsCount = await db.get('SELECT COUNT(*) as count FROM products WHERE tenant_id IS NULL');
    if (productsCount.count > 0) {
      await db.run(`UPDATE products SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
      result.warnings.push(`Migrated ${productsCount.count} products to default tenant`);
    }

    // Migrate purchase_orders table
    const ordersCount = await db.get('SELECT COUNT(*) as count FROM purchase_orders WHERE tenant_id IS NULL');
    if (ordersCount.count > 0) {
      await db.run(`UPDATE purchase_orders SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
      result.warnings.push(`Migrated ${ordersCount.count} purchase orders to default tenant`);
    }

    // Migrate consumption_records table
    const consumptionCount = await db.get('SELECT COUNT(*) as count FROM consumption_records WHERE tenant_id IS NULL');
    if (consumptionCount.count > 0) {
      await db.run(`UPDATE consumption_records SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
      result.warnings.push(`Migrated ${consumptionCount.count} consumption records to default tenant`);
    }

    // Migrate users table
    const usersCount = await db.get('SELECT COUNT(*) as count FROM users WHERE tenant_id IS NULL');
    if (usersCount.count > 0) {
      await db.run(`UPDATE users SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
      result.warnings.push(`Migrated ${usersCount.count} users to default tenant`);
    }

    // Migrate client_orders table
    const clientOrdersCount = await db.get('SELECT COUNT(*) as count FROM client_orders WHERE tenant_id IS NULL');
    if (clientOrdersCount.count > 0) {
      await db.run(`UPDATE client_orders SET tenant_id = ? WHERE tenant_id IS NULL`, [defaultTenantId]);
      result.warnings.push(`Migrated ${clientOrdersCount.count} client orders to default tenant`);
    }

    // Create tenant-supplier relationships for existing suppliers
    const suppliers = await db.all('SELECT id FROM suppliers');
    for (const supplier of suppliers) {
      await db.run(`
        INSERT OR IGNORE INTO tenant_suppliers (tenant_id, supplier_id, is_active, created_at, updated_at)
        VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [defaultTenantId, supplier.id]);
    }
    result.warnings.push(`Created ${suppliers.length} tenant-supplier relationships`);

    // Create tenant-driver relationships for existing drivers
    const drivers = await db.all('SELECT id FROM delivery_drivers');
    for (const driver of drivers) {
      await db.run(`
        INSERT OR IGNORE INTO tenant_drivers (tenant_id, driver_id, is_active, created_at, updated_at)
        VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [defaultTenantId, driver.id]);
    }
    result.warnings.push(`Created ${drivers.length} tenant-driver relationships`);

    // Add missing audit fields to existing tables
    const tablesNeedingAudit = [
      'suppliers', 'order_items', 'client_order_items', 'product_reviews', 
      'notifications', 'inventory_movements'
    ];

    for (const table of tablesNeedingAudit) {
      try {
        // Check if created_at column exists
        const columns = await db.all(`PRAGMA table_info(${table})`);
        const hasCreatedAt = columns.some(col => col.name === 'created_at');
        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');

        if (!hasCreatedAt) {
          await db.run(`ALTER TABLE ${table} ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`);
          result.warnings.push(`Added created_at column to ${table}`);
        }

        if (!hasUpdatedAt) {
          await db.run(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
          result.warnings.push(`Added updated_at column to ${table}`);
        }
      } catch (error) {
        result.warnings.push(`Could not add audit fields to ${table}: ${error}`);
      }
    }

    // Update existing order numbers to ensure uniqueness within tenant
    await db.run(`
      UPDATE client_orders 
      SET order_number = tenant_id || '-' || order_number 
      WHERE order_number NOT LIKE '%-%'
    `);

    // Commit transaction
    await db.run('COMMIT');
    
    result.success = true;
    result.message = 'Multi-tenant migration completed successfully';

  } catch (error) {
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      result.errors.push(`Rollback failed: ${rollbackError}`);
    }
    
    result.success = false;
    result.message = 'Migration failed';
    result.errors.push(`Migration error: ${error}`);
  }

  return result;
}

/**
 * Rollback migration (create a new single-tenant database)
 * WARNING: This will create a backup and reset to single-tenant structure
 */
export async function rollbackMultiTenantMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    errors: [],
    warnings: []
  };

  try {
    const db = await getDb();
    
    // This is a destructive operation, so we'll just provide a warning
    result.warnings.push('Rollback is not implemented for safety reasons.');
    result.warnings.push('To rollback, restore from a pre-migration database backup.');
    result.warnings.push('Alternatively, create a new database and import only the data you need.');
    
    result.success = false;
    result.message = 'Rollback not performed - use database backup instead';

  } catch (error) {
    result.errors.push(`Rollback error: ${error}`);
  }

  return result;
}

/**
 * Validate multi-tenant data integrity
 */
export async function validateMultiTenantData(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: '',
    errors: [],
    warnings: []
  };

  try {
    const db = await getDb();

    // Check for orphaned records without tenant_id
    const orphanedProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE tenant_id IS NULL');
    if (orphanedProducts.count > 0) {
      result.errors.push(`Found ${orphanedProducts.count} products without tenant_id`);
    }

    const orphanedOrders = await db.get('SELECT COUNT(*) as count FROM purchase_orders WHERE tenant_id IS NULL');
    if (orphanedOrders.count > 0) {
      result.errors.push(`Found ${orphanedOrders.count} purchase orders without tenant_id`);
    }

    const orphanedUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE tenant_id IS NULL');
    if (orphanedUsers.count > 0) {
      result.errors.push(`Found ${orphanedUsers.count} users without tenant_id`);
    }

    const orphanedClientOrders = await db.get('SELECT COUNT(*) as count FROM client_orders WHERE tenant_id IS NULL');
    if (orphanedClientOrders.count > 0) {
      result.errors.push(`Found ${orphanedClientOrders.count} client orders without tenant_id`);
    }

    // Check for invalid foreign key references
    const invalidTenantRefs = await db.get(`
      SELECT COUNT(*) as count FROM products p 
      LEFT JOIN tenants t ON p.tenant_id = t.id 
      WHERE t.id IS NULL AND p.tenant_id IS NOT NULL
    `);
    if (invalidTenantRefs.count > 0) {
      result.errors.push(`Found ${invalidTenantRefs.count} products with invalid tenant references`);
    }

    // Check for duplicate email addresses within tenants
    const duplicateEmails = await db.all(`
      SELECT tenant_id, email, COUNT(*) as count 
      FROM users 
      WHERE tenant_id IS NOT NULL 
      GROUP BY tenant_id, email 
      HAVING COUNT(*) > 1
    `);
    if (duplicateEmails.length > 0) {
      result.errors.push(`Found ${duplicateEmails.length} duplicate email addresses within tenants`);
    }

    // Check for duplicate order numbers within tenants
    const duplicateOrderNumbers = await db.all(`
      SELECT tenant_id, order_number, COUNT(*) as count 
      FROM client_orders 
      WHERE tenant_id IS NOT NULL 
      GROUP BY tenant_id, order_number 
      HAVING COUNT(*) > 1
    `);
    if (duplicateOrderNumbers.length > 0) {
      result.errors.push(`Found ${duplicateOrderNumbers.length} duplicate order numbers within tenants`);
    }

    if (result.errors.length > 0) {
      result.success = false;
      result.message = 'Data validation failed - integrity issues found';
    } else {
      result.message = 'Multi-tenant data validation passed';
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Validation error: ${error}`);
    result.message = 'Data validation failed due to error';
  }

  return result;
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  isMigrated: boolean;
  tenantCount: number;
  hasOrphanedData: boolean;
}> {
  try {
    const db = await getDb();
    
    const tenantCount = await db.get('SELECT COUNT(*) as count FROM tenants');
    const orphanedProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE tenant_id IS NULL');
    const orphanedUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE tenant_id IS NULL');
    
    return {
      isMigrated: tenantCount.count > 0,
      tenantCount: tenantCount.count,
      hasOrphanedData: orphanedProducts.count > 0 || orphanedUsers.count > 0
    };
  } catch (error) {
    return {
      isMigrated: false,
      tenantCount: 0,
      hasOrphanedData: true
    };
  }
}