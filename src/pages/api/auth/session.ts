import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/utils/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    return res.status(200).json({
      user: session.user,
      expires: session.expires
    });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}