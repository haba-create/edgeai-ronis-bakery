import { NextApiRequest, NextApiResponse } from 'next';
import { processSupplierMessage } from '@/agents/supplierAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, supplierId, supplierName, conversationHistory = [] } = req.body;

    if (!message || !supplierId || !supplierName) {
      return res.status(400).json({ 
        error: 'Missing required fields: message, supplierId, and supplierName are required' 
      });
    }

    const context = {
      supplierId: parseInt(supplierId),
      supplierName
    };

    const response = await processSupplierMessage(message, context, conversationHistory);

    return res.status(200).json({ 
      message: response,
      success: true
    });
  } catch (error) {
    console.error('Error in supplier agent API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}