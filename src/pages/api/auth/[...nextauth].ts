import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getDb } from '@/utils/db';
import { logger } from '@/utils/logger';

// Define custom user type
interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'supplier' | 'driver' | 'admin';
  supplierId?: number;
  tenantId?: string;
  tenantName?: string;
  isActive: boolean;
}

// Mock users for demo
const mockUsers = [
  {
    id: '1',
    email: 'admin@ronisbakery.com',
    password: 'password123',
    name: 'Admin User',
    role: 'admin' as const,
    tenants: [
      { id: 'rb-main', name: "Roni's Bakery - Main", type: 'restaurant' },
      { id: 'rb-belsize', name: "Roni's Bakery - Belsize Park", type: 'restaurant' },
      { id: 'hjb-supplier', name: 'Heritage Jewish Breads', type: 'supplier' },
      { id: 'logistics-main', name: 'EdgeAI Logistics', type: 'logistics' }
    ],
    isActive: true
  },
  {
    id: '2',
    email: 'owner@ronisbakery.com',
    password: 'password123',
    name: 'Restaurant Owner',
    role: 'client' as const,
    tenants: [
      { id: 'rb-main', name: "Roni's Bakery - Main", type: 'restaurant' },
      { id: 'rb-belsize', name: "Roni's Bakery - Belsize Park", type: 'restaurant' }
    ],
    isActive: true
  },
  {
    id: '3',
    email: 'supplier@hjb.com',
    password: 'password123',
    name: 'Heritage Breads Manager',
    role: 'supplier' as const,
    tenants: [
      { id: 'hjb-supplier', name: 'Heritage Jewish Breads', type: 'supplier' }
    ],
    isActive: true
  },
  {
    id: '4',
    email: 'driver@edgeai.com',
    password: 'password123',
    name: 'Delivery Driver',
    role: 'driver' as const,
    tenants: [
      { id: 'logistics-main', name: 'EdgeAI Logistics', type: 'logistics' }
    ],
    isActive: true
  }
];

// Extend the default session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'client' | 'supplier' | 'driver' | 'admin';
      supplierId?: number;
      tenantId?: string;
      tenantName?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'client' | 'supplier' | 'driver' | 'admin';
    supplierId?: number;
    tenantId?: string;
    tenantName?: string;
    isActive: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: 'client' | 'supplier' | 'driver' | 'admin';
    supplierId?: number;
    tenantId?: string;
    tenantName?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' }
      },
      async authorize(credentials) {
        const logContext = {
          email: credentials?.email,
          tenantId: credentials?.tenantId,
          method: 'credentials'
        };
        
        logger.authAttempt('credentials', credentials?.email || 'unknown', logContext);
        
        if (!credentials?.email || !credentials?.password) {
          logger.authFailure('Missing email or password', logContext);
          throw new Error('Email and password are required');
        }

        // For demo purposes, use mock users
        const mockUser = mockUsers.find(u => u.email === credentials.email);
        
        if (!mockUser || mockUser.password !== credentials.password) {
          logger.authFailure('Invalid credentials', logContext);
          throw new Error('Invalid email or password');
        }

        if (!mockUser.isActive) {
          logger.authFailure('Account disabled', logContext);
          throw new Error('Account is disabled');
        }

        // Handle tenant selection
        let selectedTenant = null;
        if (credentials.tenantId) {
          selectedTenant = mockUser.tenants.find(t => t.id === credentials.tenantId);
          if (!selectedTenant) {
            logger.authFailure('Invalid tenant selection', { ...logContext, availableTenants: mockUser.tenants.map(t => t.id) });
            throw new Error('Invalid tenant selection');
          }
        } else if (mockUser.tenants.length === 1) {
          // Auto-select if user has only one tenant
          selectedTenant = mockUser.tenants[0];
        }

        const user = {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: selectedTenant?.id,
          tenantName: selectedTenant?.name,
          isActive: mockUser.isActive
        };
        
        logger.authSuccess(user.id, user.role, {
          ...logContext,
          selectedTenant: selectedTenant?.id,
          tenantName: selectedTenant?.name
        });

        // Return user object with tenant info
        return user;

        // Fallback to database for production
        // const db = await getDb();
        // ... database logic here
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      logger.debug('JWT callback triggered', {
        hasUser: !!user,
        hasToken: !!token,
        tokenEmail: token?.email
      });
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.supplierId = user.supplierId;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        
        logger.debug('JWT token updated with user data', {
          userId: user.id,
          role: user.role,
          tenantId: user.tenantId
        });
      }
      return token;
    },
    async session({ session, token }) {
      logger.debug('Session callback triggered', {
        hasSession: !!session,
        hasToken: !!token,
        tokenRole: token?.role
      });
      
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.supplierId = token.supplierId;
        session.user.tenantId = token.tenantId;
        session.user.tenantName = token.tenantName;
        
        logger.debug('Session updated with token data', {
          userId: token.id,
          role: token.role,
          tenantId: token.tenantId
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      logger.debug('Redirect callback triggered', {
        url,
        baseUrl,
        isRelative: url.startsWith('/'),
        isSameOrigin: url.startsWith('http') ? new URL(url).origin === baseUrl : false
      });
      
      // Redirect to appropriate dashboard based on user role
      if (url === baseUrl || url === '/') {
        logger.debug('Redirecting to base URL', { baseUrl });
        return baseUrl;
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        const fullUrl = `${baseUrl}${url}`;
        logger.debug('Redirecting to relative URL', { url, fullUrl });
        return fullUrl;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        logger.debug('Redirecting to same origin URL', { url });
        return url;
      }
      logger.debug('Redirecting to base URL (fallback)', { baseUrl });
      return baseUrl;
    }
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);