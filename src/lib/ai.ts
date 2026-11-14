import "server-only";

// One switch for every AI feature. Returns parsed JSON, or null on any failure.
// AI_PROVIDER: "cloudflare" (Workers AI), "anthropic" (Claude), or unset (AI off).

export type AiImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };
type Ask = { task: string; system: string; prompt: string; image?: AiImage; maxTokens: number };

const TIMEOUT_MS = 20_000;
const CF_DEFAULT = "@cf/meta/llama-4-scout-17b-16e-instruct";
const CLAUDE_DEFAULT = "claude-haiku-5-5";

// The rules every prompt carries.
export const AI_RULES = [
  "Write in plain, warm, simple words. Short sentences.",
  "Do not use hype words like premium, best in Lagos, world-class or top-notch unless the seller wrote them.",
  "Never invent facts: no sizes, ingredients, guarantees, delivery times or prices the seller did not give.",
  "Never include phone numbers, links, email addresses, or the name of any church.",
  "Reply with one JSON object only. No other text.",
].join("\n");

export function aiProvider(): "cloudflare" | "anthropic" | null {
  const p = process.env.AI_PROVIDER;
  if (p === "cloudflare" && process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN) return "cloudflare";
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
export const aiReady = () => aiProvider() !== null;

// Pull the first {...} out of a reply and parse it. Bad JSON is null.
export function parseJSON(text: unknown): Record<string, unknown> | null {
  if (text && typeof text === "object" && !Array.isArray(text)) return text as Record<string, unknown>;
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

const log = (task: string, why: string) => console.warn(`[ai] ${task}: ${why}`);

async function post(url: string, headers: Record<string, string>, body: unknown) {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function cloudflare(a: Ask): Promise<unknown> {
  const base = process.env.AI_BASE_URL ?? "https://api.cloudflare.com/client/v4";
  const model = (a.image ? process.env.AI_MODEL_VISION : process.env.AI_MODEL_TEXT) || CF_DEFAULT;
  const url = `${base}/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`;
  const headers = { authorization: `Bearer ${process.env.CF_AI_TOKEN}` };
  const user = a.image
    ? [
        { type: "text", text: a.prompt },
        { type: "image_url", image_url: { url: `data:${a.image.mediaType};base64,${a.image.base64}` } },
      ]
    : a.prompt;
  const body = { messages: [{ role: "system", content: a.system }, { role: "user", content: user }], max_tokens: a.maxTokens };

  let res = await post(url, headers, body);
  if (!res.ok) {
    const text = await res.text();
    // Some Meta models want a one-time "agree" to their licence first.
    if (/agree/i.test(text) && res.status !== 429) {
      await post(url, headers, { prompt: "agree" }).catch(() => null);
      res = await post(url, headers, body);
      if (!res.ok) return log(a.task, `${res.status} after agree`), null;
    } else {
      return log(a.task, `${res.status}${/capacity/i.test(text) ? " out of capacity" : ""}`), null;
    }
  }
  const data = (await res.json()) as { success?: boolean; result?: { response?: unknown } };
  if (data.success === false) return log(a.task, "not successful"), null;
  return data.result?.response ?? null;
}

async function anthropic(a: Ask): Promise<unknown> {
  const base = process.env.AI_BASE_URL ?? "https://api.anthropic.com";
  const content = [
    ...(a.image ? [{ type: "image", source: { type: "base64", media_type: a.image.mediaType, data: a.image.base64 } }] : []),
    { type: "text", text: a.prompt },
  ];
  const res = await post(
    `${base}/v1/messages`,
    { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    {
      model: process.env.AI_MODEL_TEXT || CLAUDE_DEFAULT,
      // Room for thinking as well as the short answer.
      max_tokens: a.maxTokens + 2000,
      output_config: { effort: "low" },
      system: a.system,
      messages: [{ role: "user", content }],
    },
  );
  if (!res.ok) return log(a.task, String(res.status)), null;
  const data = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  if (data.stop_reason === "refusal") return log(a.task, "refused"), null;
  return data.content?.find((b) => b.type === "text")?.text ?? null;
}

export async function aiJSON(a: Ask): Promise<Record<string, unknown> | null> {
  const provider = aiProvider();
  if (!provider) return null;
  try {
    const raw = provider === "cloudflare" ? await cloudflare(a) : await anthropic(a);
    const out = parseJSON(raw);
    if (!out) log(a.task, "bad answer");
    return out;
  } catch (e) {
    log(a.task, (e as Error).name === "TimeoutError" ? "timed out" : (e as Error).message);
    return null;
  }
}

// Clean AI text before anyone sees it: no HTML, links, phone numbers or church names; cut to length.
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  let s = v
    .replace(/<[^>]*>/g, " ")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/\b[\w.-]+@[\w-]+\.[\w.]+\b/g, "")
    .replace(/\+?\d[\d\s-]{6,}\d/g, "")
    .replace(/\b(?:the\s+)?church of jesus christ(?: of latter[- ]day saints)?\b|\blatter[- ]day saints?\b|\blds\b|\bmormons?\b/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (s.length > max) {
    s = s.slice(0, max);
    const cut = Math.max(s.lastIndexOf(". "), s.lastIndexOf("\n"));
    s = cut > max * 0.6 ? s.slice(0, cut + 1) : s.replace(/\s+\S*$/, "") + "…";
  }
  return s.trim();
}

// A list of short strings from AI, cleaned and capped.
export const cleanList = (v: unknown, count: number, max: number) =>
  (Array.isArray(v) ? v : []).map((x) => cleanText(x, max)).filter(Boolean).slice(0, count);
