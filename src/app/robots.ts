import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

// Search engines see the public pages only. Everything else needs a login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/join", "/login", "/contact"],
      disallow: ["/api/", "/home", "/me", "/basket", "/checkout", "/orders", "/shop/", "/admin/", "/notifications", "/verify", "/search", "/area", "/sell", "/s/", "/p/", "/c/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
