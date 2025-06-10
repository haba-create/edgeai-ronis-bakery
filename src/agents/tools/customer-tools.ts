import { getDb } from '@/utils/db';

export const customerTools = [
  {
    name: 'search_products',
    description: 'Search for products by name, category, or description',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (product name, category, or keywords)'
        },
        category: {
          type: 'string',
          description: 'Filter by category (optional)'
        },
        kosher_only: {
          type: 'boolean',
          description: 'Show only kosher certified products'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_product_recommendations',
    description: 'Get personalized product recommendations based on preferences',
    parameters: {
      type: 'object',
      properties: {
        preferences: {
          type: 'array',
          items: { type: 'string' },
          description: 'Customer preferences (e.g., kosher, fresh, bakery, dairy)'
        },
        budget_range: {
          type: 'string',
          description: 'Budget range (low, medium, high)'
        }
      },
      required: ['preferences']
    }
  },
  {
    name: 'check_product_availability',
    description: 'Check if specific products are in stock',
    parameters: {
      type: 'object',
      properties: {
        product_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of product names to check'
        }
      },
      required: ['product_names']
    }
  },
  {
    name: 'get_category_products',
    description: 'Get all products in a specific category',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Product category'
        }
      },
      required: ['category']
    }
  },
  {
    name: 'get_fresh_products',
    description: 'Get products that are fresh and have good shelf life',
    parameters: {
      type: 'object',
      properties: {
        min_shelf_life: {
          type: 'number',
          description: 'Minimum shelf life in days'
        }
      }
    }
  }
];

export async function executeCustomerTool(toolName: string, parameters: any, context: any) {
  const db = await getDb();
  
  try {
    switch (toolName) {
      case 'search_products':
        return await searchProducts(db, parameters);
      case 'get_product_recommendations':
        return await getProductRecommendations(db, parameters);
      case 'check_product_availability':
        return await checkProductAvailability(db, parameters);
      case 'get_category_products':
        return await getCategoryProducts(db, parameters);
      case 'get_fresh_products':
        return await getFreshProducts(db, parameters);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error executing customer tool ${toolName}:`, error);
    return { error: 'Failed to execute tool' };
  }
}

async function searchProducts(db: any, { query, category, kosher_only }: any) {
  let sql = `
    SELECT p.*, s.name as supplier_name
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.current_stock > 0
  `;
  const params: any[] = [];
  
  if (query) {
    sql += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)`;
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (category) {
    sql += ` AND p.category = ?`;
    params.push(category);
  }
  
  if (kosher_only) {
    sql += ` AND p.kosher_certified = 1`;
  }
  
  sql += ` ORDER BY p.name LIMIT 20`;
  
  const products = await db.all(sql, params);
  return {
    products,
    count: products.length,
    message: `Found ${products.length} products matching your search.`
  };
}

async function getProductRecommendations(db: any, { preferences, budget_range }: any) {
  let sql = `
    SELECT p.*, s.name as supplier_name
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.current_stock > 0
  `;
  const params: any[] = [];
  
  // Filter by preferences
  if (preferences && preferences.length > 0) {
    const preferenceConditions = preferences.map(() => 
      '(p.category LIKE ? OR p.name LIKE ? OR p.description LIKE ?)'
    ).join(' OR ');
    
    sql += ` AND (${preferenceConditions})`;
    
    preferences.forEach((pref: string) => {
      const term = `%${pref}%`;
      params.push(term, term, term);
    });
  }
  
  // Filter by budget
  if (budget_range) {
    switch (budget_range) {
      case 'low':
        sql += ` AND p.price <= 5`;
        break;
      case 'medium':
        sql += ` AND p.price > 5 AND p.price <= 15`;
        break;
      case 'high':
        sql += ` AND p.price > 15`;
        break;
    }
  }
  
  sql += ` ORDER BY p.daily_usage DESC, p.price ASC LIMIT 10`;
  
  const products = await db.all(sql, params);
  return {
    products,
    message: `Here are ${products.length} products recommended for you based on your preferences.`
  };
}

async function checkProductAvailability(db: any, { product_names }: any) {
  const results = [];
  
  for (const name of product_names) {
    const product = await db.get(
      'SELECT name, current_stock, unit FROM products WHERE name LIKE ? LIMIT 1',
      [`%${name}%`]
    );
    
    if (product) {
      results.push({
        name: product.name,
        available: product.current_stock > 0,
        stock: product.current_stock,
        unit: product.unit
      });
    } else {
      results.push({
        name,
        available: false,
        message: 'Product not found'
      });
    }
  }
  
  return {
    availability: results,
    message: `Checked availability for ${product_names.length} products.`
  };
}

async function getCategoryProducts(db: any, { category }: any) {
  const products = await db.all(`
    SELECT p.*, s.name as supplier_name
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.category = ? AND p.current_stock > 0
    ORDER BY p.name
  `, [category]);
  
  return {
    products,
    category,
    count: products.length,
    message: `Found ${products.length} products in the ${category} category.`
  };
}

async function getFreshProducts(db: any, { min_shelf_life = 3 }: any) {
  const products = await db.all(`
    SELECT p.*, s.name as supplier_name
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.current_stock > 0 
    AND p.shelf_life_days >= ?
    AND p.storage_temp IN ('refrigerated', 'frozen')
    ORDER BY p.shelf_life_days DESC, p.name
    LIMIT 15
  `, [min_shelf_life]);
  
  return {
    products,
    message: `Found ${products.length} fresh products with at least ${min_shelf_life} days shelf life.`
  };
}