import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dropshipping/types"],
  images: {
    remotePatterns: [
      { hostname: "placehold.co" },
      { hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
