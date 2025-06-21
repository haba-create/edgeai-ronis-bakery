import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface TestResult {
  role: string;
  message: string;
  response?: string;
  tools?: string[];
  error?: string;
  metadata?: any;
}

export default function TestChatbotsPage() {
  const { data: session } = useSession();
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const testScenarios = [
    { role: 'owner', message: 'Compare prices for coffee' },
    { role: 'owner', message: 'Generate auto order' },
    { role: 'owner', message: 'Show me all products with low stock using SQL query' },
    { role: 'owner', message: 'Send an email notification about low stock to owner@ronisbakery.com' },
    { role: 'driver', message: 'Show my deliveries' },
    { role: 'driver', message: 'Get my delivery earnings using a database query' },
    { role: 'admin', message: 'Show all orders' },
    { role: 'admin', message: 'Query database for all tenants with active subscriptions' },
    { role: 'supplier', message: 'Show my pending orders' },
    { role: 'supplier', message: 'Query orders assigned to me and send status update email' },
    { role: 'customer', message: 'Show coffee products' }
  ];

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    for (const scenario of testScenarios) {
      try {
        const response = await fetch('/api/unified-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: scenario.message,
            role: scenario.role
          }),
        });

        const data = await response.json();
        
        setResults(prev => [...prev, {
          role: scenario.role,
          message: scenario.message,
          response: data.response?.substring(0, 100) + '...',
          tools: data.toolCalls?.map((tc: any) => tc.name) || [],
          metadata: data.metadata
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          role: scenario.role,
          message: scenario.message,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }
    
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Chatbot Integration Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Session Status:</strong> {session ? 'Logged in' : 'Not logged in'}</p>
            {session && (
              <>
                <p><strong>User Role:</strong> {session.user?.role || 'unknown'}</p>
                <p><strong>User ID:</strong> {session.user?.id || 'unknown'}</p>
              </>
            )}
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={testing}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            {results.map((result, idx) => (
              <div key={idx} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                result.error ? 'border-red-500' : 
                result.tools && result.tools.length > 0 ? 'border-green-500' : 'border-yellow-500'
              }`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Role: {result.role}</p>
                    <p className="text-sm text-gray-600">Message: {result.message}</p>
                  </div>
                  <div>
                    {result.error ? (
                      <p className="text-red-600">Error: {result.error}</p>
                    ) : (
                      <>
                        <p className="text-sm">Tools Used: {result.tools?.join(', ') || 'None'}</p>
                        <p className="text-sm text-gray-600">Response: {result.response}</p>
                        {result.metadata && (
                          <p className="text-xs text-gray-500">
                            Detected Role: {result.metadata.role} | User ID: {result.metadata.userId}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Expected Results:</h3>
          <ul className="text-sm space-y-1">
            <li>✅ Owner "Compare prices" → Should use <code>compare_supplier_prices</code> tool</li>
            <li>✅ Owner "Generate auto order" → Should use <code>generate_auto_order</code> tool</li>
            <li>✅ Driver "Show deliveries" → Should use <code>get_my_deliveries</code> tool</li>
            <li>✅ Admin "Show orders" → Should use <code>get_all_orders</code> tool</li>
            <li>✅ Supplier "Show pending" → Should use <code>get_my_orders</code> tool</li>
            <li>✅ Customer "Show coffee" → Should use <code>search_products</code> tool</li>
          </ul>
        </div>
      </div>
    </div>
  );
}