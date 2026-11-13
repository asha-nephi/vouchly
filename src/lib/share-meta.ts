import type { Metadata } from "next";

// Link preview details for a shop or listing page.
export function shareMeta(o: { title: string; description: string; path: string; photo?: string | null }): Metadata {
  const images = o.photo ? [{ url: `/api/share-image?src=${encodeURIComponent(o.photo)}`, width: 1200, height: 630, alt: o.title }] : undefined;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: o.path },
    openGraph: { title: o.title, description: o.description, url: o.path, type: "website", ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, ...(images ? { images: images.map((i) => i.url) } : {}) },
  };
}

// First words of a longer text, for descriptions.
export const clip = (t: string | null | undefined, n = 150) => (!t ? "" : t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
