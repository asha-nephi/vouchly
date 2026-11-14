import "server-only";
import { and, eq, gt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, shops } from "@/db/schema";
import { categoryLabel, naira } from "@/lib/catalog";
import { SELLER_TYPES, type SellerType } from "@/lib/seller-types";
import { AI_RULES, aiJSON, cleanList, cleanText, type AiImage } from "@/lib/ai";

export type Kind = "item" | "stay" | "service" | "digital" | "session" | "event";
export type Draft = { name: string; about: string; tags: string[]; included: string[] };

const KIND_WORDS: Record<Kind, string> = {
  item: "a product people buy",
  stay: "a place guests book by the night",
  service: "a service done for the customer",
  digital: "a file people download after paying",
  session: "a 1-on-1 session people book a time for",
  event: "a class or event people buy tickets for",
};

// Asks AI for a listing draft. Null when AI is off, fails or answers badly.
export async function draftListing(input: {
  words: string;
  kind: Kind;
  shop: { name: string; category: string; sellerType: SellerType; trades: string[] };
  image?: AiImage;
}): Promise<Draft | null> {
  const service = input.kind === "service";
  const shape = `{"name": "up to 60 characters", "about": "2 to 4 short sentences, up to 400 characters", "tags": ["up to 5 short words buyers might search"]${
    service ? `, "included": ["up to 4 short lines of what the price covers, only things the seller said"]` : ""
  }}`;
  const system = ["TASK: writer", "You help a seller in Lagos, Nigeria write a listing for a small online marketplace.", AI_RULES, `JSON shape: ${shape}`].join("\n");
  const prompt = [
    `This listing is ${KIND_WORDS[input.kind]}.`,
    `Shop: ${input.shop.name}. It sells ${categoryLabel(input.shop.category)}. Seller type: ${SELLER_TYPES[input.shop.sellerType].title.replace(/^I /, "")}.`,
    input.shop.trades.length ? `What they do: ${input.shop.trades.join(", ")}.` : "",
    `The seller's own words: "${input.words}"`,
    input.image ? "A photo is attached. Only mention what you can clearly see in it." : "",
  ]
    .filter(Boolean)
    .join("\n");
  const out = await aiJSON({ task: "writer", system, prompt, image: input.image, maxTokens: 500 });
  if (!out) return null;
  const name = cleanText(out.name, 60).replace(/[.…]+$/, "");
  if (name.length < 2) return null;
  return {
    name,
    about: cleanText(out.about, 400),
    tags: [...new Set(cleanList(out.tags, 5, 30).map((t) => t.toLowerCase().replace(/^#/, "")))],
    included: service ? cleanList(out.included, 4, 80) : [],
  };
}

// The middle half of prices for each kind of listing in a category. Hidden with fewer than 3.
export async function similarPrices(category: string): Promise<Partial<Record<Kind, string>>> {
  const rows = await db
    .select({
      kind: products.kind,
      n: sql<number>`count(*)::int`,
      lo: sql<number>`percentile_cont(0.25) within group (order by ${products.priceKobo})`,
      hi: sql<number>`percentile_cont(0.75) within group (order by ${products.priceKobo})`,
    })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(
      and(
        eq(products.isActive, true),
        eq(products.removed, false),
        eq(shops.category, category as (typeof shops.category.enumValues)[number]),
        gt(products.priceKobo, 0),
        or(ne(products.kind, "service"), eq(products.priceType, "fixed")),
      ),
    )
    .groupBy(products.kind);
  const round = (kobo: number) => Math.round(Number(kobo) / 10_000) * 10_000; // nearest ₦100
  const out: Partial<Record<Kind, string>> = {};
  for (const r of rows) {
    if (r.n < 3) continue;
    const lo = round(r.lo);
    const hi = round(r.hi);
    out[r.kind] = lo === hi ? naira(lo) : `${naira(lo)} – ${naira(hi)}`;
  }
  return out;
}
