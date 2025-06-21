import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  context?: any;
}

export default function LogViewer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/login');
    }
  }, [session, status, router]);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs/stream');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh logs
  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000); // Every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'WARN': return 'text-yellow-600 bg-yellow-50';
      case 'INFO': return 'text-blue-600 bg-blue-50';
      case 'DEBUG': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'errors') return log.level.toUpperCase() === 'ERROR';
    if (filter === 'warnings') return log.level.toUpperCase() === 'WARN';
    if (filter === 'chatbot') return log.message.toLowerCase().includes('chatbot') || 
                                     log.message.toLowerCase().includes('agent');
    return true;
  });

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading logs...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Log Viewer - Roni's Bakery</title>
      </Head>

      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🔍 Real-Time Log Viewer</h1>
            
            <div className="flex items-center space-x-4">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-md border-gray-300"
              >
                <option value="all">All Logs</option>
                <option value="errors">Errors Only</option>
                <option value="warnings">Warnings</option>
                <option value="chatbot">Chatbot/Agent</option>
              </select>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh
              </label>
              
              <button
                onClick={fetchLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Now
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-gray-900 text-green-400 p-4 font-mono text-sm">
            <div className="mb-2 text-gray-400">
              Showing {filteredLogs.length} logs (Total: {logs.length}) - Last updated: {new Date().toLocaleTimeString()}
            </div>
            
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No logs found</div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className={`p-2 rounded ${getLevelColor(log.level)} font-mono text-xs`}>
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="font-bold ml-2">{log.level}:</span>
                    <span className="ml-2">{log.message}</span>
                    {log.context && (
                      <div className="mt-1 ml-4 text-gray-600">
                        <pre className="text-xs">{JSON.stringify(log.context, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🧪 Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>This page shows real-time logs from the application</li>
            <li>Filter by "Chatbot/Agent" to see chatbot-related issues</li>
            <li>Filter by "Errors Only" to see what's breaking</li>
            <li>Keep this open while testing to see what happens</li>
            <li>Auto-refresh updates every 2 seconds</li>
          </ol>
        </div>
      </div>
    </div>
  );
}