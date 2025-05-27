import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();

  try {
    if (req.method === 'GET') {
      const { supplierId } = req.query;

      let query = `
        SELECT 
          dd.*,
          s.name as supplier_name,
          COUNT(dt.id) as active_deliveries
        FROM delivery_drivers dd
        LEFT JOIN suppliers s ON dd.supplier_id = s.id
        LEFT JOIN delivery_tracking dt ON dd.id = dt.driver_id AND dt.status IN ('assigned', 'in_transit')
      `;
      
      const params = [];
      
      if (supplierId) {
        query += ' WHERE dd.supplier_id = ?';
        params.push(supplierId);
      }
      
      query += ' GROUP BY dd.id ORDER BY dd.name';

      const drivers = await db.all(query, params);

      return res.status(200).json({ drivers });
    }

    if (req.method === 'POST') {
      const { 
        name, 
        phone, 
        email, 
        vehicleRegistration, 
        licenseNumber, 
        supplierId 
      } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      const result = await db.run(
        `INSERT INTO delivery_drivers (name, phone, email, vehicle_registration, license_number, supplier_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, phone, email, vehicleRegistration, licenseNumber, supplierId]
      );

      const newDriver = await db.get(
        'SELECT * FROM delivery_drivers WHERE id = ?',
        [result.lastID]
      );

      return res.status(201).json({ 
        success: true, 
        message: 'Driver created successfully',
        driver: newDriver
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in drivers API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}