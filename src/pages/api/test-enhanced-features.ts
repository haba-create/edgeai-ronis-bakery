import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';
import { getSupplierPricesForProduct, generateAutoOrder } from '@/utils/auto-ordering';
import { sendOrderConfirmation, sendLowStockAlert } from '@/utils/email-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = await getDb();
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    console.log('Starting enhanced feature tests...');

    // Test 1: Check expanded database
    const supplierCount = await db.get('SELECT COUNT(*) as count FROM suppliers');
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    const pricingCount = await db.get('SELECT COUNT(*) as count FROM supplier_product_pricing');
    
    results.tests.push({
      name: 'Database Expansion',
      status: supplierCount.count >= 25 ? 'PASSED' : 'FAILED',
      details: {
        suppliers: supplierCount.count,
        products: productCount.count,
        pricing_entries: pricingCount.count
      }
    });

    // Test 2: Price comparison functionality
    const coffeeProduct = await db.get("SELECT id FROM products WHERE name LIKE '%Coffee%' LIMIT 1");
    if (coffeeProduct) {
      const prices = await getSupplierPricesForProduct(coffeeProduct.id, 8.0);
      results.tests.push({
        name: 'Price Comparison',
        status: prices.length > 0 ? 'PASSED' : 'FAILED',
        details: {
          product_id: coffeeProduct.id,
          suppliers_found: prices.length,
          best_price: prices[0]?.price,
          best_supplier: prices[0]?.supplier_name
        }
      });
    }

    // Test 3: Auto-order generation
    const autoOrder = await generateAutoOrder(1); // Tenant ID 1
    results.tests.push({
      name: 'Auto Order Generation',
      status: autoOrder.recommendations.length > 0 ? 'PASSED' : 'FAILED',
      details: {
        recommendations: autoOrder.recommendations.length,
        total_cost: autoOrder.total_cost,
        total_savings: autoOrder.total_savings,
        suppliers_involved: Object.keys(autoOrder.grouped_by_supplier).length
      }
    });

    // Test 4: Email service (test mode)
    let emailTestPassed = false;
    let emailError = null;
    
    try {
      // Test email service connectivity
      const mailService = new (await import('@/utils/email-service')).MailTrapService();
      // We'll just verify the service is created successfully
      emailTestPassed = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Unknown error';
    }

    results.tests.push({
      name: 'Email Service Integration',
      status: emailTestPassed ? 'PASSED' : 'FAILED',
      details: {
        mailtrap_configured: !!process.env.MAILTRAP_API_TOKEN,
        service_initialized: emailTestPassed,
        error: emailError
      }
    });

    // Test 5: Enhanced owner tools availability
    const ownerTools = await import('@/agents/tools/enhanced-owner-tools');
    const toolsAvailable = ownerTools.enhancedOwnerTools.length;
    
    results.tests.push({
      name: 'Enhanced Chatbot Tools',
      status: toolsAvailable >= 8 ? 'PASSED' : 'FAILED',
      details: {
        tools_count: toolsAvailable,
        tool_names: ownerTools.enhancedOwnerTools.map(t => t.name)
      }
    });

    // Summary
    const passedTests = results.tests.filter((t: any) => t.status === 'PASSED').length;
    const totalTests = results.tests.length;
    
    results.summary = {
      total_tests: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      success_rate: `${(passedTests / totalTests * 100).toFixed(1)}%`
    };

    // Add system info
    results.system_info = {
      node_env: process.env.NODE_ENV,
      has_openai_key: !!process.env.OPENAI_API_KEY,
      has_langsmith: process.env.LANGSMITH_TRACING === 'true',
      has_mailtrap: !!process.env.MAILTRAP_API_TOKEN
    };

    console.log('Enhanced feature tests completed:', results.summary);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Test suite error:', error);
    res.status(500).json({ 
      error: 'Test suite failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      partial_results: results
    });
  }
}