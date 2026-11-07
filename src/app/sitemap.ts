import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/join`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
