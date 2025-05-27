import { NextApiRequest, NextApiResponse } from 'next';
import { getAllProducts, getProductCategories } from '@/services/productService';
import { initDatabase } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Initialize database if needed
    await initDatabase();
    
    if (req.method === 'GET') {
      // Check if we're requesting categories only
      if (req.query.categories === 'true') {
        const categories = await getProductCategories();
        return res.status(200).json({ categories });
      }
      
      // Get all products
      const products = await getAllProducts();
      return res.status(200).json({ products });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling product request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
