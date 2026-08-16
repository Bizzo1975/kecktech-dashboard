/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@marketlist/shared'],
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_ORIGIN || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiOrigin}/socket.io/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
