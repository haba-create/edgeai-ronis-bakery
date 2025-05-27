import { NextApiRequest, NextApiResponse } from 'next';
import { getProductById, updateProductStock, recordConsumption } from '@/services/productService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const productId = parseInt(id as string);
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    if (req.method === 'GET') {
      const product = await getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      return res.status(200).json({ product });
    }
    
    if (req.method === 'PATCH') {
      const { action, quantity, notes } = req.body;
      
      if (!action || quantity === undefined || isNaN(parseFloat(quantity))) {
        return res.status(400).json({ error: 'Invalid request body' });
      }
      
      // Check if the product exists
      const product = await getProductById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      if (action === 'updateStock') {
        const updatedProduct = await updateProductStock(productId, parseFloat(quantity));
        return res.status(200).json({ product: updatedProduct });
      }
      
      if (action === 'recordConsumption') {
        // Check if there's enough stock
        if (product.current_stock < parseFloat(quantity)) {
          return res.status(400).json({ error: 'Not enough stock available' });
        }
        
        await recordConsumption(productId, parseFloat(quantity), notes);
        const updatedProduct = await getProductById(productId);
        return res.status(200).json({ product: updatedProduct });
      }
      
      return res.status(400).json({ error: 'Invalid action' });
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
