/**
 * Comprehensive Chatbot Testing API
 * Tests all chatbot functionality for every user role and domain
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';

interface TestScenario {
  role: string;
  message: string;
  expectedKeywords?: string[];
  expectedTools?: string[];
  description: string;
}

interface TestResult {
  scenario: string;
  role: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  response?: string;
  executedTools?: number;
  duration: number;
  issues?: string[];
}

interface TestResponse {
  success: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: TestResult[];
  timestamp: string;
  duration: number;
}

// Test scenarios for each role
const TEST_SCENARIOS: TestScenario[] = [
  // Admin Tests
  {
    role: 'admin',
    message: 'Show me the system status and tenant overview',
    expectedKeywords: ['system', 'status', 'tenant'],
    expectedTools: ['get_system_status', 'get_tenant_overview'],
    description: 'Admin system monitoring'
  },
  {
    role: 'admin',
    message: 'Create a new tenant for a bakery called "Sweet Dreams Bakery"',
    expectedKeywords: ['tenant', 'create', 'Sweet Dreams'],
    expectedTools: ['create_tenant'],
    description: 'Admin tenant management'
  },
  {
    role: 'admin',
    message: 'Get system analytics for the past month',
    expectedKeywords: ['analytics', 'month'],
    expectedTools: ['get_system_analytics'],
    description: 'Admin analytics access'
  },

  // Owner Tests
  {
    role: 'owner',
    message: 'Show me my inventory status and any items that need reordering',
    expectedKeywords: ['inventory', 'reorder', 'status'],
    expectedTools: ['get_client_inventory', 'get_client_analytics'],
    description: 'Owner inventory management'
  },
  {
    role: 'owner',
    message: 'Create a purchase order for flour and sugar from my supplier',
    expectedKeywords: ['purchase', 'order', 'flour', 'sugar'],
    expectedTools: ['create_client_order'],
    description: 'Owner order creation'
  },
  {
    role: 'owner',
    message: 'Send an email to my customers about our new holiday specials',
    expectedKeywords: ['email', 'customers', 'holiday'],
    expectedTools: ['mailtrap_send_email'],
    description: 'Owner customer communication'
  },

  // Supplier Tests
  {
    role: 'supplier',
    message: 'Show me all pending orders that need to be confirmed',
    expectedKeywords: ['pending', 'orders', 'confirm'],
    expectedTools: ['get_pending_orders'],
    description: 'Supplier order management'
  },
  {
    role: 'supplier',
    message: 'Update order #123 status to confirmed and assign driver',
    expectedKeywords: ['update', 'order', 'confirmed', 'driver'],
    expectedTools: ['update_order_status', 'assign_delivery_driver'],
    description: 'Supplier order processing'
  },
  {
    role: 'supplier',
    message: 'Get my delivery performance metrics for this month',
    expectedKeywords: ['performance', 'metrics', 'delivery'],
    expectedTools: ['get_supplier_performance'],
    description: 'Supplier performance tracking'
  },

  // Driver Tests
  {
    role: 'driver',
    message: 'Show me my deliveries for today',
    expectedKeywords: ['deliveries', 'today'],
    expectedTools: ['get_my_deliveries'],
    description: 'Driver delivery schedule'
  },
  {
    role: 'driver',
    message: 'Update my location and get navigation to my next delivery',
    expectedKeywords: ['location', 'navigation', 'next'],
    expectedTools: ['update_location', 'get_navigation_route'],
    description: 'Driver navigation assistance'
  },
  {
    role: 'driver',
    message: 'Mark delivery #456 as completed and show my earnings',
    expectedKeywords: ['completed', 'delivery', 'earnings'],
    expectedTools: ['complete_delivery', 'get_driver_earnings'],
    description: 'Driver delivery completion'
  },

  // Customer Tests
  {
    role: 'customer',
    message: 'I\'m looking for fresh challah bread for Shabbat',
    expectedKeywords: ['challah', 'bread', 'shabbat', 'fresh'],
    description: 'Customer product search'
  },
  {
    role: 'customer',
    message: 'What kosher items do you recommend for a holiday meal?',
    expectedKeywords: ['kosher', 'recommend', 'holiday', 'meal'],
    description: 'Customer product recommendations'
  },
  {
    role: 'customer',
    message: 'Is your chocolate babka available today?',
    expectedKeywords: ['chocolate', 'babka', 'available', 'today'],
    description: 'Customer availability inquiry'
  }
];

async function runChatbotTest(scenario: TestScenario): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    logger.info('Running chatbot test', { 
      role: scenario.role, 
      description: scenario.description 
    });

    const response = await fetch('http://localhost:3001/api/unified-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: scenario.message,
        role: scenario.role
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        scenario: scenario.description,
        role: scenario.role,
        status: 'fail',
        message: `HTTP ${response.status}: ${response.statusText}`,
        duration,
        issues: [`API request failed with status ${response.status}`]
      };
    }

    const data = await response.json();
    
    if (!data.response) {
      return {
        scenario: scenario.description,
        role: scenario.role,
        status: 'fail',
        message: 'No response received from agent',
        duration,
        issues: ['Empty response from agent']
      };
    }

    // Analyze response quality
    const issues: string[] = [];
    let status: 'pass' | 'fail' | 'warning' = 'pass';

    // Check for fallback mode
    if (data.fallbackMode || data.metadata?.fallbackMode) {
      issues.push('Agent running in fallback mode');
      status = 'warning';
    }

    // Check for error indicators
    if (data.response.toLowerCase().includes('error') || 
        data.response.toLowerCase().includes('sorry') ||
        data.response.toLowerCase().includes('trouble')) {
      issues.push('Response indicates potential error');
      status = 'warning';
    }

    // Check for expected keywords
    if (scenario.expectedKeywords) {
      const missingKeywords = scenario.expectedKeywords.filter(keyword => 
        !data.response.toLowerCase().includes(keyword.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        issues.push(`Missing expected keywords: ${missingKeywords.join(', ')}`);
        if (status === 'pass') status = 'warning';
      }
    }

    // Check response length (too short might indicate poor quality)
    if (data.response.length < 50) {
      issues.push('Response is very short, might lack detail');
      if (status === 'pass') status = 'warning';
    }

    return {
      scenario: scenario.description,
      role: scenario.role,
      status,
      message: status === 'pass' ? 'Test passed successfully' : 'Test completed with issues',
      response: data.response,
      executedTools: data.metadata?.executedTools || 0,
      duration,
      issues: issues.length > 0 ? issues : undefined
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      scenario: scenario.description,
      role: scenario.role,
      status: 'fail',
      message: 'Test execution failed',
      duration,
      issues: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      summary: { total: 0, passed: 0, failed: 1, warnings: 0 },
      results: [{
        scenario: 'HTTP Method Check',
        role: 'system',
        status: 'fail',
        message: `Method ${req.method} not allowed`,
        duration: 0
      }],
      timestamp: new Date().toISOString(),
      duration: 0
    });
  }

  const testStartTime = Date.now();
  logger.info('Starting comprehensive chatbot tests', { 
    totalScenarios: TEST_SCENARIOS.length 
  });

  // Run tests with limited concurrency to avoid overwhelming the system
  const results: TestResult[] = [];
  const batchSize = 3; // Process 3 tests at a time
  
  for (let i = 0; i < TEST_SCENARIOS.length; i += batchSize) {
    const batch = TEST_SCENARIOS.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(scenario => runChatbotTest(scenario))
    );
    results.push(...batchResults);
    
    // Small delay between batches to prevent rate limiting
    if (i + batchSize < TEST_SCENARIOS.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const totalDuration = Date.now() - testStartTime;

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length
  };

  const success = summary.failed === 0;

  logger.info('Chatbot tests completed', {
    summary,
    totalDuration,
    success
  });

  res.status(success ? 200 : 500).json({
    success,
    summary,
    results,
    timestamp: new Date().toISOString(),
    duration: totalDuration
  });
}