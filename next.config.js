/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export since we have API routes
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // config options here
};

module.exports = nextConfig; 