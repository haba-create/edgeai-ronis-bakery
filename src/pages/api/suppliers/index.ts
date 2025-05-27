import { NextApiRequest, NextApiResponse } from 'next';
import { getAllSuppliers } from '@/services/orderService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const suppliers = await getAllSuppliers();
      return res.status(200).json({ suppliers });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling suppliers request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
