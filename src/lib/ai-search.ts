import "server-only";
import { AREAS, CATEGORIES } from "@/lib/catalog";
import { SELLER_TYPES } from "@/lib/seller-types";
import { SECTION_IDS, type Section } from "@/lib/sections";
import { AI_RULES, aiJSON, cleanText } from "@/lib/ai";

const TRADES = SELLER_TYPES.service.trades.filter((t) => t !== "Other");
const HINTS = /\b(need|needs|someone|somebody|tomorrow|today|near|cheap|under|around|looking for|who can|this week)\b/i;

// Only sentences go to AI. Short searches like "zobo" stay normal.
export const looksLikeSentence = (q: string) => q.trim().split(/\s+/).length >= 4 || HINTS.test(q);

// The cache key: the same question in different case or spacing is the same question.
export const searchKey = (q: string) => q.toLowerCase().replace(/[^\p{L}\p{N}\s₦]/gu, " ").replace(/\s+/g, " ").trim();

const same = (a: unknown, b: string) => typeof a === "string" && a.trim().toLowerCase() === b.toLowerCase();

// Asks AI to turn a sentence into filters, then keeps only real values. Returns URL params or null.
export async function sentenceToFilters(q: string, current: Section): Promise<Record<string, string> | null> {
  const system = [
    "TASK: search",
    "Turn a buyer's message into search filters for a small marketplace in Lagos, Nigeria.",
    AI_RULES,
    "Sections: products (food, drinks, clothes, things to buy, places to stay), services (a pro who does a job: repairs, cleaning, chef, tailor, hair), online (downloads, 1-on-1 coaching, classes, events).",
    `Trades (services only): ${TRADES.join(", ")}.`,
    `Categories: ${CATEGORIES.map((c) => c.id).join(", ")}.`,
    `Areas: ${AREAS.join(", ")}.`,
    'JSON shape: {"section": "products" | "services" | "online", "trade"?: one trade, "category"?: one category, "area"?: one area, "when"?: "today" | "tomorrow" | "this_week", "maxPriceNaira"?: number, "keywords"?: "1 to 3 words for what they want"}',
    "Leave out anything the message does not say.",
  ].join("\n");
  const out = await aiJSON({ task: "search", system, prompt: `Buyer's message: "${q}"`, maxTokens: 200 });
  if (!out) return null;

  // Throw away anything that isn't one of our real values.
  const section = SECTION_IDS.find((s) => same(out.section, s)) ?? current;
  const p: Record<string, string> = { s: section };
  const trade = section === "services" ? TRADES.find((t) => same(out.trade, t)) : undefined;
  if (trade) p.trade = trade;
  const cat = section !== "online" ? CATEGORIES.find((c) => same(out.category, c.id) || same(out.category, c.label)) : undefined;
  if (cat && !trade) p.cat = cat.id;
  const area = AREAS.find((a) => same(out.area, a));
  if (area) p.area = area;
  if (section === "services" && (out.when === "tomorrow" || out.when === "today")) p.when = "tomorrow";
  if (section === "services" && out.when === "this_week") p.when = "week";
  if (section === "online" && out.when === "this_week") p.date = "week";
  const max = Number(out.maxPriceNaira);
  if (Number.isInteger(max) && max > 0 && max <= 10_000_000) p.max = String(max);
  const words = cleanText(out.keywords, 40).replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
  if (words && !trade && !cat) p.q = words;
  p.ai = "1";
  return p;
}
