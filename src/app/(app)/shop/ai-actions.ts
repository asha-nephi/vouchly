"use server";

import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { aiReady, type AiImage } from "@/lib/ai";
import { AI_RESTING, runAi, whoIs } from "@/lib/ai-use";
import { draftListing, type Draft, type Kind } from "@/lib/ai-writer";
import { draftPost, MAX_VERSIONS, POST_TYPES, withLink, type PostAbout, type PostLang, type PostType } from "@/lib/ai-post";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { categoryLabel } from "@/lib/catalog";
import { priceText } from "@/lib/listings";
import { siteUrl } from "@/lib/site";
import { todayKey } from "@/lib/dates";

export type WriteResult = { ok: true; draft: Draft } | { ok: false; error: string };

const KINDS: Kind[] = ["item", "stay", "service", "digital", "session", "event"];
const TRY_AGAIN = "AI couldn't write it this time. Try again, or write it yourself.";
const POST_AGAIN = "AI couldn't make a post this time. Try again, or write your own.";

// "Write it for me": a draft the seller checks and edits. Nothing is saved here.
export async function writeListing(input: { words: string; kind: string; image?: string }): Promise<WriteResult> {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop || user.role === "buyer" || !user.confirmed) return { ok: false, error: "Only sellers can use this." };
  if (!aiReady()) return { ok: false, error: TRY_AGAIN };
  const words = String(input.words ?? "").trim().slice(0, 300);
  if (words.length < 3) return { ok: false, error: "Write a few words about it first, like “zobo 1 litre, ginger, no sugar”." };
  const kind = KINDS.find((k) => k === input.kind) ?? "item";

  // A small JPEG from the phone, if they picked a photo.
  let image: AiImage | undefined;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.image ?? "");
  if (m && m[2].length < 1_500_000) image = { mediaType: m[1] as AiImage["mediaType"], base64: m[2] };

  const res = await runAi({
    who: await whoIs(user.id),
    feature: "writer",
    call: () => draftListing({ words, kind, shop, image }),
  });
  if (!res.ok) return { ok: false, error: res.resting ? AI_RESTING : TRY_AGAIN };
  return { ok: true, draft: res.value };
}

export type PostResult = { ok: true; text: string; full: string; version: number } | { ok: false; error: string };

const KIND_NAME: Record<string, string> = { item: "a product", stay: "a place to stay", service: "a service", digital: "a download", session: "a 1-on-1 session", event: "a class or event" };

// "Make a post": a post about one listing, or about the whole shop. Up to 3 versions a day each.
export async function makePost(input: { productId?: string; type: string; lang: string; version: number }): Promise<PostResult> {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop || user.role === "buyer" || !user.confirmed) return { ok: false, error: "Only sellers can use this." };
  if (!aiReady()) return { ok: false, error: POST_AGAIN };
  const type = (Object.keys(POST_TYPES) as PostType[]).find((t) => t === input.type) ?? "status";
  const lang: PostLang = input.lang === "pcm" ? "pcm" : "en";
  const version = Math.max(1, Math.floor(Number(input.version) || 1));
  if (version > MAX_VERSIONS) return { ok: false, error: "That's 3 versions for today. Copy one you like, or write your own." };

  let about: PostAbout;
  let link: string;
  let key: string;
  if (input.productId) {
    if (!/^[0-9a-f-]{36}$/.test(input.productId)) return { ok: false, error: POST_AGAIN };
    const [p] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.shopId, shop.id), eq(products.removed, false)))
      .limit(1);
    if (!p) return { ok: false, error: POST_AGAIN };
    about = { kind: "listing", name: p.name, about: p.about, what: KIND_NAME[p.kind], price: priceText(p), shop: shop.name };
    link = `${siteUrl()}/p/${p.id}`;
    key = `post:${p.id}`;
  } else {
    about = { kind: "shop", name: shop.name, about: shop.about, sells: categoryLabel(shop.category), area: shop.area };
    link = `${siteUrl()}/s/${shop.slug}`;
    key = `post:shop:${shop.id}`;
  }

  const res = await runAi({
    who: await whoIs(user.id),
    feature: "post",
    cacheKey: `${key}:${type}:${lang}:${version}:${todayKey()}`,
    call: () => draftPost(about, type, lang, version),
  });
  if (!res.ok) return { ok: false, error: res.resting ? AI_RESTING : POST_AGAIN };
  return { ok: true, text: res.value, full: withLink(res.value, link), version };
}
