import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import fs from 'fs';
import path from 'path';

// Store logs in memory for real-time viewing
const logs: any[] = [];
const MAX_LOGS = 1000;

export function addLog(level: string, message: string, context?: any) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    id: Date.now() + Math.random()
  };
  
  logs.unshift(log);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  
  // Also write to console
  console.log(`[${log.timestamp}] ${level}: ${message}`, context || '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only admins can view logs
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'GET') {
    // Return last 100 logs
    return res.json({
      logs: logs.slice(0, 100),
      total: logs.length,
      timestamp: new Date().toISOString()
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}