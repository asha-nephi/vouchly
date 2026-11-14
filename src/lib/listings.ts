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

export const KIND_LABEL = { item: "Product", stay: "Stay", service: "Service", digital: "Digital", session: "Session", event: "Event" } as const;

type ListingLike = {
  kind: "item" | "stay" | "service" | "digital" | "session" | "event";
  durationMins?: number | null;
  eventAt?: Date | null;
  online?: boolean;
  fileName?: string | null;
  fileSize?: number | null;
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
  if ((p.kind === "digital" || p.kind === "event") && p.priceKobo === 0) return "Free";
  if (p.kind === "session") return `${money(p.priceKobo)} a session`;
  return money(p.priceKobo);
}

// The small grey line under a listing's name.
export function listingLine(p: ListingLike) {
  if (p.kind === "stay")
    return [p.guests && `${p.guests} ${p.guests === 1 ? "guest" : "guests"}`, p.bedrooms && `${p.bedrooms} ${p.bedrooms === 1 ? "bedroom" : "bedrooms"}`].filter(Boolean).join(" · ");
  if (p.kind === "service") return ["Service", p.serviceAreas.length ? p.serviceAreas.slice(0, 3).join(", ") + (p.serviceAreas.length > 3 ? "…" : "") : "All of Lagos"].join(" · ");
  if (p.kind === "session") return [durationLabel(p.durationMins ?? null), p.online ? "Online" : "In person"].filter(Boolean).join(" · ");
  if (p.kind === "event") return [eventWhen(p.eventAt ?? null), p.online ? "Online" : "In person"].filter(Boolean).join(" · ");
  if (p.kind === "digital") return ["Instant download", p.fileName?.split(".").pop()?.toUpperCase()].filter(Boolean).join(" · ");
  return [p.size, p.sellMode === "preorder" ? "Pre-order" : "In stock"].filter(Boolean).join(" · ");
}

export const DURATIONS = [30, 45, 60, 90, 120] as const;
export const durationLabel = (m: number | null) => (!m ? "" : m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m / 60} hr`);
export const DAY_HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"] as const;

// "Sat 21 Nov, 2pm" for a moment in Lagos.
export function eventWhen(d: Date | null) {
  if (!d) return "";
  const day = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(d);
  const t = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(d).replace(":00", "").replace(" ", "");
  return `${day}, ${t.toLowerCase()}`;
}

// The label on a listing's small action button.
export function ctaLabel(p: { kind: ListingLike["kind"]; priceKobo: number; priceType: "fixed" | "quote" }) {
  if (p.kind === "item") return "Add";
  if (p.kind === "stay" || p.kind === "session") return "Book";
  if (p.kind === "event") return "Tickets";
  if (p.kind === "digital") return p.priceKobo === 0 ? "Get" : "Buy";
  return p.priceType === "quote" ? "Ask" : "Book";
}

// The small white pill on a listing's photo. Empty when there's nothing useful to say.
export function tileTag(p: ListingLike, readyDay?: string) {
  if (p.kind === "item") return p.sellMode === "preorder" ? (readyDay ? `Pre-order · ${readyDay}` : "Pre-order") : "In stock";
  if (p.kind === "event") {
    const w = eventWhen(p.eventAt ?? null);
    return w.slice(0, w.lastIndexOf(",")) || "Event"; // the date, without the time
  }
  if (p.kind === "digital") return "Instant download";
  if (p.kind === "session") return p.online ? "Online" : "In person";
  if (p.kind === "stay") return "Stay";
  return "";
}
