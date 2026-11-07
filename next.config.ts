import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Room for a few shrunk photos per form.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
