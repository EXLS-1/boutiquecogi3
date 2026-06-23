import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cacheComponents: true, // ← Active le feature flag
  },
  // ... vos autres options
};

export default nextConfig;
