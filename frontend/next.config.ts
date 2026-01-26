import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_TMDB_API_KEY: '9a9c53620db722c1693223034acd306d',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/**',
      },
    ],
  },
  // Optimizations for Render Free Tier (Prevent OOM)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Reduce memory usage
    cpus: 1,
    workerThreads: false,
  },
};


export default nextConfig;
