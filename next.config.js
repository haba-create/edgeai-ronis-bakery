/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    APP_NAME: "Roni's Coffee Shop Ordering System",
    LOCATION: "Belsize Park, London"
  },
  images: {
    domains: ['localhost', 'railway.app'],
  },
};

module.exports = nextConfig;
