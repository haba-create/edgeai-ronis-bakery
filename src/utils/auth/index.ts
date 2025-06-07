import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { NextApiRequest, NextApiResponse } from 'next';
import { Session } from 'next-auth';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await hash(password, saltRounds);
}

/**
 * Get the current session from API routes
 */
export async function getSession(req: NextApiRequest, res: NextApiResponse): Promise<Session | null> {
  return await getServerSession(req, res, authOptions);
}

/**
 * Check if user has required role
 */
export function hasRole(session: Session | null, allowedRoles: string[]): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role);
}

/**
 * Check if user belongs to a specific tenant (supplier)
 */
export function belongsToTenant(session: Session | null, supplierId: number): boolean {
  if (!session?.user) return false;
  
  // Admins can access all tenants
  if (session.user.role === 'admin') return true;
  
  // Check if user belongs to the specific supplier
  return session.user.supplierId === supplierId;
}

/**
 * Middleware to protect API routes
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles?: string[]
): Promise<Session | null> {
  const session = await getSession(req, res);
  
  if (!session) {
    res.status(401).json({ error: 'Unauthorized - Please login' });
    return null;
  }
  
  if (allowedRoles && !hasRole(session, allowedRoles)) {
    res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    return null;
  }
  
  return session;
}

/**
 * Middleware to protect tenant-specific routes
 */
export async function requireTenantAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  supplierId: number
): Promise<Session | null> {
  const session = await getSession(req, res);
  
  if (!session) {
    res.status(401).json({ error: 'Unauthorized - Please login' });
    return null;
  }
  
  if (!belongsToTenant(session, supplierId)) {
    res.status(403).json({ error: 'Forbidden - Access denied to this tenant' });
    return null;
  }
  
  return session;
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    // Node.js environment
    const crypto = require('crypto');
    crypto.randomFillSync(array);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}