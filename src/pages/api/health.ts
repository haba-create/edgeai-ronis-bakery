import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  environment?: string;
  version?: string;
  database?: 'connected' | 'disconnected';
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  const startTime = Date.now();
  
  try {
    // Check database connection
    const db = await getDb();
    
    // Simple query to verify connection
    try {
      await db.get('SELECT 1 as test');
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      return res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: 'disconnected',
        error: 'Database connection failed'
      });
    }

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  }
}