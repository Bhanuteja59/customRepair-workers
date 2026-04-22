import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/earnings', destination: '/dashboard?tab=earnings', permanent: true },
      { source: '/help', destination: '/dashboard?tab=help', permanent: true },
      { source: '/settings', destination: '/dashboard?tab=settings', permanent: true },
      { source: '/analytics', destination: '/dashboard?tab=earnings', permanent: true },
      { source: '/messages', destination: '/dashboard', permanent: true },
    ];
  },
};

export default nextConfig;
