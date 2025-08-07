import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    // Optimize chunks for faster loading
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react"],
  },
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
  },
  // Headers for better caching
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=1, stale-while-revalidate=59",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
