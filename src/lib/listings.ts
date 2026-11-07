// Stay and service options, safe to use in the browser too.

export const AMENITIES = [
  "Wi-Fi",
  "AC",
  "24/7 power",
  "Inverter",
  "Generator",
  "Parking",
  "Kitchen",
  "Smart TV",
  "Pool",
  "Gym",
  "Security",
  "Washing machine",
  "Hot water",
  "Workspace",
] as const;

export const TIME_SLOTS = [
  { key: "morning", label: "Morning", hours: "8am – 12pm" },
  { key: "afternoon", label: "Afternoon", hours: "12pm – 4pm" },
  { key: "evening", label: "Evening", hours: "4pm – 7pm" },
] as const;

export const slotLabel = (key: string | null) => {
  const s = TIME_SLOTS.find((t) => t.key === key);
  return s ? `${s.label} (${s.hours})` : "";
};

export const CHECK_TIMES = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"] as const;

// "14:00" → "2pm"
export function timeLabel(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hr = h % 12 || 12;
  return `${hr}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export const KIND_LABEL = { item: "Product", stay: "Stay", service: "Service" } as const;

type ListingLike = {
  kind: "item" | "stay" | "service";
  priceKobo: number;
  priceType: "fixed" | "quote";
  priceUnit: string | null;
  size: string | null;
  sellMode: "preorder" | "in_stock";
  guests: number | null;
  bedrooms: number | null;
  serviceAreas: string[];
};

const money = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

// "₦45,000 a night", "Price after a chat", "₦15,000 per visit"
export function priceText(p: ListingLike) {
  if (p.kind === "stay") return `${money(p.priceKobo)} a night`;
  if (p.kind === "service") return p.priceType === "quote" ? "Price after a chat" : [money(p.priceKobo), p.priceUnit].filter(Boolean).join(" ");
  return money(p.priceKobo);
}

// The small grey line under a listing's name.
export function listingLine(p: ListingLike) {
  if (p.kind === "stay")
    return [p.guests && `${p.guests} ${p.guests === 1 ? "guest" : "guests"}`, p.bedrooms && `${p.bedrooms} ${p.bedrooms === 1 ? "bedroom" : "bedrooms"}`].filter(Boolean).join(" · ");
  if (p.kind === "service") return ["Service", p.serviceAreas.length ? p.serviceAreas.slice(0, 3).join(", ") + (p.serviceAreas.length > 3 ? "…" : "") : "All of Lagos"].join(" · ");
  return [p.size, p.sellMode === "preorder" ? "Pre-order" : "In stock"].filter(Boolean).join(" · ");
}
