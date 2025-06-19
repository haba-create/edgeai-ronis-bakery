import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupplierPricesForProduct } from '@/utils/auto-ordering';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { product_id, product_name, min_quality = 8.0 } = req.query;
    
    if (!product_id && !product_name) {
      return res.status(400).json({ error: 'Either product_id or product_name is required' });
    }
    
    let productId: number;
    
    if (product_id) {
      productId = parseInt(product_id as string);
    } else {
      // Find product by name
      const db = await getDb();
      const product = await db.get(
        'SELECT id FROM products WHERE name LIKE ?',
        [`%${product_name}%`]
      );
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      productId = product.id;
    }
    
    const suppliers = await getSupplierPricesForProduct(
      productId, 
      parseFloat(min_quality as string)
    );
    
    if (suppliers.length === 0) {
      return res.status(404).json({ 
        error: 'No suppliers found for this product meeting quality requirements' 
      });
    }
    
    // Calculate potential savings
    const db = await getDb();
    const currentProduct = await db.get(
      'SELECT name, price, unit FROM products WHERE id = ?',
      [productId]
    );
    
    const bestPrice = suppliers[0].price;
    const currentPrice = currentProduct.price;
    const savings = Math.max(0, currentPrice - bestPrice);
    
    res.status(200).json({
      product: {
        id: productId,
        name: currentProduct.name,
        current_price: currentPrice,
        unit: currentProduct.unit
      },
      suppliers,
      comparison: {
        cheapest_supplier: suppliers[0].supplier_name,
        cheapest_price: bestPrice,
        current_price: currentPrice,
        savings_per_unit: savings,
        percentage_savings: currentPrice > 0 ? ((savings / currentPrice) * 100).toFixed(1) : '0'
      }
    });
  } catch (error) {
    console.error('Supplier prices API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch supplier prices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}