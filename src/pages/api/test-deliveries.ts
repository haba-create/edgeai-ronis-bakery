import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    
    // We'll assume driver ID 1 exists from seeding, just focus on delivery tracking

    // Create some test purchase orders if they don't exist
    for (let i = 1; i <= 3; i++) {
      const existingOrder = await db.get('SELECT id FROM purchase_orders WHERE id = ?', [i]);
      if (!existingOrder) {
        await db.run(`
          INSERT INTO purchase_orders (id, tenant_id, supplier_id, order_date, delivery_date, status, total_cost, notes)
          VALUES (?, 1, 1, datetime('now'), datetime('now', '+1 day'), 'confirmed', ?, 'Test order for driver chat demo')
        `, [i, 25.50 + (i * 5)]);
      }
    }

    // Create test delivery tracking records
    const deliveries = [
      {
        id: 1,
        order_id: 1,
        driver_id: 1,
        status: 'assigned',
        pickup_location: 'Heritage Jewish Breads, 42 Industrial Way, N7 9QJ',
        delivery_address: "Roni's Belsize Park, 15 Belsize Terrace, NW3 4AX",
        estimated_arrival: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        special_instructions: 'Use side entrance for deliveries'
      },
      {
        id: 2,
        order_id: 2,
        driver_id: 1,
        status: 'pickup',
        pickup_location: 'Heritage Jewish Breads, 42 Industrial Way, N7 9QJ',
        delivery_address: "Roni's West Hampstead, 234 West End Lane, NW6 1LG",
        estimated_arrival: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        special_instructions: 'Ring bell twice for deliveries'
      },
      {
        id: 3,
        order_id: 3,
        driver_id: 1,
        status: 'assigned',
        pickup_location: 'Heritage Jewish Breads, 42 Industrial Way, N7 9QJ',
        delivery_address: "Roni's Camden, 12 Camden High Street, NW1 7JE",
        estimated_arrival: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 1.5 hours from now
        special_instructions: 'Call customer on arrival'
      }
    ];

    // Insert delivery tracking records with minimal fields
    for (const delivery of deliveries) {
      const existing = await db.get('SELECT id FROM delivery_tracking WHERE id = ?', [delivery.id]);
      if (!existing) {
        await db.run(`
          INSERT INTO delivery_tracking 
          (id, order_id, driver_id, status, estimated_arrival)
          VALUES (?, ?, ?, ?, ?)
        `, [
          delivery.id,
          delivery.order_id,
          delivery.driver_id,
          delivery.status,
          delivery.estimated_arrival
        ]);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Created ${deliveries.length} test deliveries for driver testing`,
      deliveries: deliveries.length
    });

  } catch (error) {
    console.error('Error creating test deliveries:', error);
    res.status(500).json({ 
      error: 'Failed to create test deliveries',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}