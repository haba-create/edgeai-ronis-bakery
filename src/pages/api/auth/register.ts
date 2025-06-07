import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/utils/db';
import { hashPassword } from '@/utils/auth';

interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: 'client' | 'supplier' | 'driver' | 'admin';
  supplierId?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, fullName, phone, role, supplierId }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Validate role
    const validRoles = ['client', 'supplier', 'driver', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate supplier ID for supplier and driver roles
    if ((role === 'supplier' || role === 'driver') && !supplierId) {
      return res.status(400).json({ error: 'Supplier ID is required for supplier and driver roles' });
    }

    const db = await getDb();

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // If supplier ID is provided, verify it exists
    if (supplierId) {
      const supplier = await db.get(
        'SELECT id FROM suppliers WHERE id = ?',
        [supplierId]
      );
      
      if (!supplier) {
        return res.status(400).json({ error: 'Invalid supplier ID' });
      }
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await db.run(
      `INSERT INTO users (
        email, 
        password_hash, 
        full_name, 
        phone, 
        role, 
        supplier_id, 
        is_active, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [email, passwordHash, fullName, phone || null, role, supplierId || null]
    );

    // If user is a client, create a default address (optional)
    if (role === 'client' && req.body.address) {
      const { address } = req.body;
      await db.run(
        `INSERT INTO client_addresses (
          user_id,
          address_label,
          street_address,
          city,
          postcode,
          latitude,
          longitude,
          is_default,
          delivery_instructions,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`,
        [
          result.lastID,
          address.label || 'Home',
          address.streetAddress,
          address.city,
          address.postcode,
          address.latitude || 40.748817,  // Default NYC coordinates
          address.longitude || -73.985428,
          address.deliveryInstructions || null
        ]
      );
    }

    return res.status(201).json({
      message: 'User registered successfully',
      userId: result.lastID,
      email,
      role
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}