// Simple test API endpoint
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.status(200).json({
      success: true,
      message: 'Railway API test successful!',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
        HAS_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        HAS_NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
        platform: process.platform
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}