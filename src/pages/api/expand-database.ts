import type { NextApiRequest, NextApiResponse } from 'next';
import { expandDatabase } from '@/utils/expand-database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting database expansion...');
    await expandDatabase();
    
    res.status(200).json({ 
      success: true, 
      message: 'Database expanded successfully with new suppliers and products' 
    });
  } catch (error) {
    console.error('Database expansion error:', error);
    res.status(500).json({ 
      error: 'Failed to expand database', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}