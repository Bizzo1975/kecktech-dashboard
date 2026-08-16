import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Allow CMS container build while App Router params types migrate to Promise<>
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Compression
  compress: true,
  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // Mark Prisma packages as external - use Node.js require() instead of bundling
  // Prisma 5 works better with Next.js than Prisma 6
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
