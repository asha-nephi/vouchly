import type { NextConfig } from "next";

// Photos on Cloudflare R2, once it's set up.
const r2 = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;

const dev = process.env.NODE_ENV !== "production";

// Browser safety rules. Pages keep their own small inline scripts, and nothing loads from other sites.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Room for photos and digital product files. The middleware keeps other pages to a small size.
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
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
