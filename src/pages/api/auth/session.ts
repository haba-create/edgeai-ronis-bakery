import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/utils/auth';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  const requestId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const logContext = {
    requestId,
    endpoint: '/api/auth/session',
    userAgent: req.headers['user-agent'],
    ip: Array.isArray(req.headers['x-forwarded-for']) 
      ? req.headers['x-forwarded-for'][0] 
      : req.headers['x-forwarded-for'] || req.connection.remoteAddress
  };

  logger.apiRequest('GET', '/api/auth/session', logContext);

  if (req.method !== 'GET') {
    logger.warn('Method not allowed', { ...logContext, method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    logger.debug('Getting session from request', logContext);
    const session = await getSession(req, res);
    
    if (!session) {
      logger.authFailure('No session found', logContext);
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/auth/session', 401, duration, logContext);
      return res.status(401).json({ error: 'Not authenticated' });
    }

    logger.authSuccess(session.user?.id || 'unknown', session.user?.role || 'unknown', {
      ...logContext,
      userEmail: session.user?.email,
      sessionExpires: session.expires
    });
    
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/auth/session', 200, duration, logContext);

    return res.status(200).json({
      user: session.user,
      expires: session.expires
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Session error', logContext, error as Error);
    logger.apiResponse('GET', '/api/auth/session', 500, duration, logContext);
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}