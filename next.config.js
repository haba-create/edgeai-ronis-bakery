/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    // These would be loaded from .env file in a real application
    APP_NAME: "Roni's Coffee Shop Ordering System",
    LOCATION: "Belsize Park, London"
  },
  images: {
    domains: ['localhost', 'railway.app'],
  },
  // Railway specific configuration
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // Ensure server listens on all interfaces
  serverRuntimeConfig: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
  },
};

module.exports = nextConfig;
