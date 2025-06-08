import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function TestLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      setResult(result);
    } catch (error: any) {
      setResult({ error: error?.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Test Login</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="admin@ronisbakery.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="password123"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Demo users:</p>
          <ul className="list-disc list-inside">
            <li>admin@ronisbakery.com / password123</li>
            <li>owner@ronisbakery.com / password123</li>
            <li>supplier@hjb.com / password123</li>
            <li>driver@edgeai.com / password123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}