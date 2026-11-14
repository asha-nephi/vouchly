// Search engine details for shop and listing pages.
const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

const abs = (u: string) => new URL(u, SITE).toString();

type Shop = { name: string; slug: string; area: string; about: string | null };
type Stats = { rating: number | null; reviews: number };
type Listing = {
  id: string;
  name: string;
  about: string | null;
  kind: string;
  priceKobo: number;
  priceType: string;
  photos: string[];
  online: boolean;
  eventAt: Date | null;
};

const rating = (s: Stats) =>
  s.rating && s.reviews > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviews, bestRating: 5 } } : {};

export function shopJsonLd(shop: Shop, stats: Stats) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE}/s/${shop.slug}#shop`,
    name: shop.name,
    url: `${SITE}/s/${shop.slug}`,
    description: shop.about ?? `${shop.name}, a Latter-day Saint business in ${shop.area}, Lagos, on Vouchly.`,
    address: { "@type": "PostalAddress", addressLocality: shop.area, addressRegion: "Lagos", addressCountry: "NG" },
    ...rating(stats),
  };
}

export function listingJsonLd(p: Listing, shop: Shop, stats: Stats) {
  const url = `${SITE}/p/${p.id}`;
  const seller = { "@type": "LocalBusiness", name: shop.name, url: `${SITE}/s/${shop.slug}` };
  const offer =
    p.priceType === "fixed" && p.priceKobo >= 0
      ? { offers: { "@type": "Offer", url, price: (p.priceKobo / 100).toFixed(2), priceCurrency: "NGN", availability: "https://schema.org/InStock", seller } }
      : {};
  const base = { "@context": "https://schema.org", name: p.name, url, description: p.about ?? undefined, image: p.photos.slice(0, 3).map(abs) };
  if (p.kind === "event" && p.eventAt)
    return {
      ...base,
      "@type": "Event",
      startDate: p.eventAt.toISOString(),
      eventAttendanceMode: p.online ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
      location: p.online ? { "@type": "VirtualLocation", url } : { "@type": "Place", name: shop.area, address: { "@type": "PostalAddress", addressLocality: shop.area, addressRegion: "Lagos", addressCountry: "NG" } },
      organizer: seller,
      ...offer,
    };
  if (p.kind === "service" || p.kind === "session")
    return { ...base, "@type": "Service", provider: seller, areaServed: { "@type": "City", name: "Lagos" }, ...offer, ...rating(stats) };
  return { ...base, "@type": "Product", brand: { "@type": "Brand", name: shop.name }, ...offer, ...rating(stats) };
}

// Safe to put inside a script tag, even if a seller writes "</script>".
export const ldJson = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");
