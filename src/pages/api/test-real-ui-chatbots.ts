import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatbotTest {
  ui_page: string;
  endpoint: string;
  test_message: string;
  role: string;
  expected_behavior: string;
  status: 'PASSED' | 'FAILED';
  response?: string;
  tools_used?: string[];
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  const tests: ChatbotTest[] = [];

  console.log('=== TESTING ACTUAL UI CHATBOTS ===');
  console.log('Testing chatbots as they are used in the real UI...\n');

  // Test configurations matching ACTUAL UI implementation
  const uiChatbotTests = [
    {
      ui_page: 'Owner Dashboard (/owner)',
      endpoint: '/api/unified-agent',
      test_message: 'Compare prices for coffee',
      role: 'owner',
      expected_behavior: 'Should use compare_supplier_prices tool'
    },
    {
      ui_page: 'Owner Dashboard (/owner)',
      endpoint: '/api/unified-agent',
      test_message: 'Generate auto order',
      role: 'owner',
      expected_behavior: 'Should use generate_auto_order tool'
    },
    {
      ui_page: 'Driver App (/driver)',
      endpoint: '/api/unified-agent',
      test_message: 'Show my deliveries',
      role: 'driver',
      expected_behavior: 'Should use get_my_deliveries tool'
    },
    {
      ui_page: 'Admin Dashboard (/admin)',
      endpoint: '/api/unified-agent',
      test_message: 'Show all orders',
      role: 'admin',
      expected_behavior: 'Should use get_all_orders tool'
    },
    {
      ui_page: 'Supplier Portal (/supplier)',
      endpoint: '/api/unified-agent',
      test_message: 'Show my orders',
      role: 'supplier',
      expected_behavior: 'Should use get_my_orders tool'
    }
  ];

  // Test each chatbot configuration
  for (const config of uiChatbotTests) {
    console.log(`\nTesting: ${config.ui_page}`);
    console.log(`Message: "${config.test_message}"`);
    
    try {
      // Make the EXACT same request the UI makes
      const response = await fetch(`${baseUrl}${config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: config.test_message,
          role: config.role
        })
      });

      const data = await response.json();
      
      // Check response
      const hasResponse = data.response && data.response.length > 0;
      const hasError = data.error || data.response?.includes('error') || data.response?.includes('encountered an error');
      const toolsUsed = data.toolCalls?.map((tc: any) => tc.name) || [];
      
      // For owner role, check if enhanced tools are being used
      const isEnhancedToolExpected = config.role === 'owner' && 
        (config.test_message.toLowerCase().includes('compare') || 
         config.test_message.toLowerCase().includes('auto order'));
      
      const correctToolUsed = isEnhancedToolExpected ? 
        (toolsUsed.includes('compare_supplier_prices') || toolsUsed.includes('generate_auto_order')) :
        toolsUsed.length > 0;

      const passed = response.ok && hasResponse && !hasError && 
                    (config.role !== 'owner' || correctToolUsed);

      console.log(`Status: ${response.status}`);
      console.log(`Tools used: ${toolsUsed.join(', ') || 'None'}`);
      console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

      tests.push({
        ui_page: config.ui_page,
        endpoint: config.endpoint,
        test_message: config.test_message,
        role: config.role,
        expected_behavior: config.expected_behavior,
        status: passed ? 'PASSED' : 'FAILED',
        response: data.response?.substring(0, 100) + '...',
        tools_used: toolsUsed,
        error: !passed ? (data.error || 'No enhanced tools used or error in response') : undefined
      });

    } catch (error) {
      console.log(`Result: ❌ FAILED - ${error}`);
      
      tests.push({
        ui_page: config.ui_page,
        endpoint: config.endpoint,
        test_message: config.test_message,
        role: config.role,
        expected_behavior: config.expected_behavior,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test legacy endpoints that some UI components might still use
  console.log('\n=== TESTING LEGACY ENDPOINTS ===');
  
  const legacyTests = [
    {
      ui_page: 'Owner (if using old endpoint)',
      endpoint: '/api/owner-agent',
      test_message: 'Check inventory',
      role: 'owner'
    },
    {
      ui_page: 'Driver (if using old endpoint)',
      endpoint: '/api/driver-chat',
      test_message: 'Show deliveries',
      role: 'driver'
    }
  ];

  for (const config of legacyTests) {
    try {
      const response = await fetch(`${baseUrl}${config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: config.test_message,
          userId: '1',
          userRole: config.role
        })
      });

      const data = await response.json();
      const passed = response.ok && data.response && !data.error;

      tests.push({
        ui_page: config.ui_page,
        endpoint: config.endpoint,
        test_message: config.test_message,
        role: config.role,
        expected_behavior: 'Legacy endpoint compatibility',
        status: passed ? 'PASSED' : 'FAILED',
        response: data.response?.substring(0, 100) + '...',
        error: !passed ? (data.error || 'No response') : undefined
      });

    } catch (error) {
      tests.push({
        ui_page: config.ui_page,
        endpoint: config.endpoint,
        test_message: config.test_message,
        role: config.role,
        expected_behavior: 'Legacy endpoint compatibility',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Generate summary
  const passed = tests.filter(t => t.status === 'PASSED').length;
  const failed = tests.filter(t => t.status === 'FAILED').length;
  const ownerTestsPassed = tests.filter(t => t.role === 'owner' && t.status === 'PASSED').length;
  const ownerTestsTotal = tests.filter(t => t.role === 'owner').length;

  console.log('\n=== SUMMARY ===');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Owner Enhanced Features: ${ownerTestsPassed}/${ownerTestsTotal}`);

  const criticalIssues = [];
  if (ownerTestsPassed < ownerTestsTotal) {
    criticalIssues.push('Owner enhanced features (price comparison, auto order) not working in UI');
  }
  if (failed > passed) {
    criticalIssues.push('Majority of UI chatbots are failing');
  }

  res.status(200).json({
    summary: {
      total: tests.length,
      passed,
      failed,
      success_rate: `${((passed / tests.length) * 100).toFixed(1)}%`,
      owner_enhanced_features: `${ownerTestsPassed}/${ownerTestsTotal} working`,
      critical_issues: criticalIssues
    },
    tests,
    recommendations: [
      'Ensure unified-agent endpoint properly detects and uses role parameter',
      'Verify enhanced owner tools are loaded for owner role',
      'Check authentication/session handling in UI components',
      'Test with real browser interactions to verify actual user experience',
      'Update any components still using legacy endpoints'
    ]
  });
}