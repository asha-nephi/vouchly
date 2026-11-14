import "server-only";
import { AI_RULES, aiJSON, cleanText } from "@/lib/ai";

export const POST_TYPES = {
  status: { label: "WhatsApp status", ask: "a WhatsApp status: 1 or 2 short lines, no hashtags", max: 200, lines: 2, tags: 0 },
  caption: { label: "Instagram caption", ask: "an Instagram caption: up to 4 short lines, then up to 5 hashtags on the last line", max: 600, lines: 5, tags: 5 },
  broadcast: { label: "WhatsApp broadcast", ask: "a short, friendly WhatsApp broadcast message to customers, 2 to 4 sentences, no hashtags", max: 500, lines: 6, tags: 0 },
} as const;
export type PostType = keyof typeof POST_TYPES;
export type PostLang = "en" | "pcm";
export const MAX_VERSIONS = 3;

export type PostAbout =
  | { kind: "listing"; name: string; about: string | null; what: string; price: string; shop: string }
  | { kind: "shop"; name: string; about: string | null; sells: string; area: string };

// AI writes the words; code adds the link later. Null when AI fails.
export async function draftPost(about: PostAbout, type: PostType, lang: PostLang, version: number): Promise<string | null> {
  const t = POST_TYPES[type];
  const system = [
    "TASK: post",
    "You help a small seller in Lagos, Nigeria share what they sell with friends and customers.",
    AI_RULES,
    lang === "pcm" ? "Write in simple, friendly Nigerian Pidgin." : "Write in simple, friendly English.",
    "Do not write any link or say where to click. A link is added after your text.",
    'JSON shape: {"text": "the post"}',
  ].join("\n");
  const facts =
    about.kind === "listing"
      ? [`Listing: ${about.name} (${about.what}).`, `Price: ${about.price}.`, about.about ? `Seller's description: ${about.about}` : "", `Shop: ${about.shop}.`]
      : [`Shop: ${about.name}. It sells ${about.sells} in ${about.area}, Lagos.`, about.about ? `Seller's description: ${about.about}` : ""];
  const prompt = [`Write ${t.ask}.`, ...facts, `Version ${version}: make it different from other versions.`].filter(Boolean).join("\n");
  const out = await aiJSON({ task: "post", system, prompt, maxTokens: 300 });
  if (!out) return null;

  let text = cleanText(out.text, t.max);
  // Keep to the set number of lines and hashtags.
  let tags = 0;
  text = text
    .split("\n")
    .slice(0, t.lines)
    .map((line) => line.replace(/#\w+/g, (h) => (++tags <= t.tags ? h : "")).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return text.length >= 5 ? text : null;
}

// What the seller copies: the AI words, then our exact link.
export const withLink = (text: string, link: string) => `${text}\n\n${link}\nPay safely on Vouchly`;
