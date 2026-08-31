import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cyiwlubjrqyjwgggnqhu.supabase.co",
        pathname: "/**",
      },
    ],
  },
  // Indique à Node.js de créer un fichier localStorage persistant
   serverExternalPackages: [],
};

export default nextConfig;
