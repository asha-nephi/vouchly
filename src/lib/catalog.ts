// Fixed lists used across the app.

export const CATEGORIES = [
  { id: "food", label: "Food & drinks" },
  { id: "stays", label: "Stays" },
  { id: "repairs", label: "Repairs" },
  { id: "fashion", label: "Fashion" },
  { id: "home_care", label: "Home care" },
  { id: "events", label: "Events" },
  { id: "tech", label: "Tech" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const AREAS = [
  "Ikeja", "Ogba", "Opebi", "Maryland", "Agege", "Ojodu", "Magodo", "Gbagada", "Yaba", "Surulere",
  "Lekki", "Ajah", "Victoria Island", "Ikoyi", "Festac", "Ikorodu", "Egbeda", "Isolo",
] as const;

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const CUTOFF_TIMES = ["12:00", "15:00", "18:00", "20:00", "22:00"] as const;

// "thu 18:00" → "Thursday 6pm"
export function cutoffLabel(cutoff: string): string {
  const [day, time] = cutoff.split(" ");
  const full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = full[DAY_KEYS.indexOf(day as (typeof DAY_KEYS)[number])] ?? day;
  const h = Number(time?.split(":")[0] ?? 0);
  const t = h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`;
  return `${d} ${t}`;
}

// Kobo ⇄ naira. All money is stored in kobo.
export const naira = (kobo: number) => "₦" + (kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 });
export function toKobo(input: string): number | null {
  const n = Number(input.replace(/[₦,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n * 100);
}

// "Mama's Tigernut!" → "mamas-tigernut"
export const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "shop";
