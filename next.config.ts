import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,

  partialPrefetching: true,

  allowedDevOrigins: ["192.168.0.144"],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;