import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function SystemTest() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/login');
    }
  }, [session, status, router]);

  const runTests = async () => {
    setTesting(true);
    const testResults: TestResult[] = [];

    // 1. Test Health Check
    try {
      const healthRes = await fetch('/api/health');
      const health = await healthRes.json();
      testResults.push({
        name: 'Health Check',
        status: health.status === 'healthy' ? 'success' : 'error',
        message: `System status: ${health.status}`,
        details: health
      });
    } catch (error) {
      testResults.push({
        name: 'Health Check',
        status: 'error',
        message: 'Failed to check health',
        details: error
      });
    }

    // 2. Test OpenAI Configuration
    try {
      const envRes = await fetch('/api/test');
      const env = await envRes.json();
      const hasOpenAI = env.environment.OPENAI_API_KEY && 
                       env.environment.OPENAI_API_KEY !== 'undefined' &&
                       env.environment.OPENAI_API_KEY !== 'your_openai_api_key_here';
      
      testResults.push({
        name: 'OpenAI Configuration',
        status: hasOpenAI ? 'success' : 'error',
        message: hasOpenAI ? 'OpenAI API configured' : 'OpenAI API NOT configured',
        details: { configured: hasOpenAI }
      });
    } catch (error) {
      testResults.push({
        name: 'OpenAI Configuration',
        status: 'error',
        message: 'Failed to check OpenAI',
        details: error
      });
    }

    // 3. Test LangSmith Configuration
    try {
      const envRes = await fetch('/api/test');
      const env = await envRes.json();
      const hasLangSmith = env.environment.LANGSMITH_API_KEY && 
                          env.environment.LANGSMITH_TRACING === 'true';
      
      testResults.push({
        name: 'LangSmith Tracing',
        status: hasLangSmith ? 'success' : 'warning',
        message: hasLangSmith ? 'LangSmith tracing enabled' : 'LangSmith tracing disabled',
        details: { 
          configured: hasLangSmith,
          project: env.environment.LANGSMITH_PROJECT 
        }
      });
    } catch (error) {
      testResults.push({
        name: 'LangSmith Tracing',
        status: 'error',
        message: 'Failed to check LangSmith',
        details: error
      });
    }

    // 4. Test Admin Agent
    try {
      const agentRes = await fetch('/api/admin-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test: How many users are in the system?' })
      });
      
      const agent = await agentRes.json();
      const hasError = agent.error || agent.metadata?.error;
      
      testResults.push({
        name: 'Admin Chatbot API',
        status: hasError ? 'error' : 'success',
        message: hasError ? `Error: ${agent.error || 'Fallback mode'}` : 'Admin chatbot working',
        details: agent
      });
    } catch (error) {
      testResults.push({
        name: 'Admin Chatbot API',
        status: 'error',
        message: 'Failed to test admin chatbot',
        details: error
      });
    }

    // 5. Test Unified Agent
    try {
      const unifiedRes = await fetch('/api/unified-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Execute SQL: SELECT COUNT(*) as total FROM users', 
          role: 'admin' 
        })
      });
      
      const unified = await unifiedRes.json();
      const executed = unified.toolCalls?.length > 0;
      
      testResults.push({
        name: 'Unified Agent (SQL)',
        status: executed ? 'success' : 'warning',
        message: executed ? 'SQL execution working' : 'SQL not executed (fallback mode)',
        details: unified
      });
    } catch (error) {
      testResults.push({
        name: 'Unified Agent (SQL)',
        status: 'error',
        message: 'Failed to test unified agent',
        details: error
      });
    }

    // 6. Test Database Connection
    try {
      const dbRes = await fetch('/api/admin/system-metrics');
      if (dbRes.ok) {
        const metrics = await dbRes.json();
        testResults.push({
          name: 'Database Connection',
          status: 'success',
          message: `Database connected - ${metrics.activeUsers} active users`,
          details: metrics
        });
      } else {
        testResults.push({
          name: 'Database Connection',
          status: 'error',
          message: 'Database API error',
          details: { status: dbRes.status }
        });
      }
    } catch (error) {
      testResults.push({
        name: 'Database Connection',
        status: 'error',
        message: 'Failed to test database',
        details: error
      });
    }

    setTests(testResults);
    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>System Test - Roni's Bakery</title>
      </Head>

      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🧪 System Test Dashboard</h1>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={runTests}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {testing ? 'Testing...' : 'Run All Tests'}
              </button>
              
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {tests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 text-lg">Click "Run All Tests" to check system status</p>
            </div>
          ) : (
            tests.map((test, index) => (
              <div key={index} className={`rounded-lg shadow p-6 ${getStatusColor(test.status)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{getStatusIcon(test.status)}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{test.name}</h3>
                      <p className="mt-1">{test.message}</p>
                      {test.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm underline">View Details</summary>
                          <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔍 What These Tests Check</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
            <li><strong>Health Check:</strong> Basic API connectivity</li>
            <li><strong>OpenAI Configuration:</strong> AI chatbot functionality</li>
            <li><strong>LangSmith Tracing:</strong> Monitoring and debugging</li>
            <li><strong>Admin Chatbot:</strong> Specific admin agent endpoint</li>
            <li><strong>Unified Agent:</strong> SQL execution capabilities</li>
            <li><strong>Database Connection:</strong> Real data access</li>
          </ul>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">🚀 Current Deployment</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            <li><strong>Port:</strong> {window.location.port || '3000'}</li>
            <li><strong>Environment:</strong> {window.location.port === '3003' ? 'Docker Production' : 'Development'}</li>
            <li><strong>Session:</strong> {session?.user?.email} ({session?.user?.role})</li>
          </ul>
        </div>
      </div>
    </div>
  );
}