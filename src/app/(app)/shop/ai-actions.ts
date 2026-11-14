"use server";

import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { aiReady, type AiImage } from "@/lib/ai";
import { AI_RESTING, useAi, whoIs } from "@/lib/ai-use";
import { draftListing, type Draft, type Kind } from "@/lib/ai-writer";

export type WriteResult = { ok: true; draft: Draft } | { ok: false; error: string };

const KINDS: Kind[] = ["item", "stay", "service", "digital", "session", "event"];
const TRY_AGAIN = "AI couldn't write it this time. Try again, or write it yourself.";

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

  const res = await useAi({
    who: await whoIs(user.id),
    feature: "writer",
    call: () => draftListing({ words, kind, shop, image }),
  });
  if (!res.ok) return { ok: false, error: res.resting ? AI_RESTING : TRY_AGAIN };
  return { ok: true, draft: res.value };
}
