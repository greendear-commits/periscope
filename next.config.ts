import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-693eb708abc54b4294fb0afbe2dbaa3b.r2.dev",
      },
    ],
  },
};

export default nextConfig;
