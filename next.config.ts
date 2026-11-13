import type { NextConfig } from "next";

// Photos on Cloudflare R2, once it's set up.
const r2 = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;

const nextConfig: NextConfig = {
  // Room for photos and digital product files.
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
  poweredByHeader: false,
  images: {
    formats: ["image/webp"], // quick to make on a small server
    minimumCacheTTL: 31536000, // photos never change, so keep them a year
    deviceSizes: [384, 640, 828, 1080, 1200],
    imageSizes: [48, 64, 96, 128, 160, 256],
    qualities: [70, 75],
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      ...(r2 ? [{ protocol: r2.protocol.replace(":", "") as "https", hostname: r2.hostname }] : []),
    ],
  },
};

export default nextConfig;
