/**
 * Agent Health Check Endpoint
 * Provides health status for the unified agent system
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { healthCheck } from '@/agents/unifiedAgentsSDK';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const health = await healthCheck();
    const status = health.agentsSDK && health.database ? 200 : 503;
    
    res.status(status).json({
      status: status === 200 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      components: {
        agentsSDK: health.agentsSDK ? 'operational' : 'degraded',
        openaiKey: health.openaiKey ? 'configured' : 'missing',
        database: health.database ? 'connected' : 'disconnected'
      },
      capabilities: {
        supportedRoles: health.supportedRoles,
        fallbackMode: !health.agentsSDK
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      components: {
        agentsSDK: 'unknown',
        openaiKey: 'unknown', 
        database: 'unknown'
      }
    });
  }
}