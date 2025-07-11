import { NextApiRequest, NextApiResponse } from 'next';
import { seedDatabase } from '@/data/seedData';
import { generateHistoricalData } from '@/data/historicalSeed';
import { initDatabase } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      // Initialize database
      await initDatabase();
      
      // Seed database with initial data
      await seedDatabase();
      
      // Generate historical data
      await generateHistoricalData();
      
      return res.status(200).json({ success: true, message: 'Database seeded successfully with historical data' });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error seeding database:', error);
    return res.status(500).json({ 
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
