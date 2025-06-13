/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
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
};

module.exports = nextConfig;
