/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // These would be loaded from .env file in a real application
    APP_NAME: "Roni's Coffee Shop Ordering System",
    LOCATION: "Belsize Park, London"
  },
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
