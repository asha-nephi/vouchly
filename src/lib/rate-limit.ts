import "server-only";
import { headers } from "next/headers";

// Simple per-server counters. Vouchly runs on one server, so memory is enough.
const hits = new Map<string, number[]>();

// The visitor's IP address.
// Cloudflare sets cf-connecting-ip itself, so a visitor can't fake it there.
// Otherwise we take the address the nearest proxy saw (the end of x-forwarded-for),
// never the start, which the visitor can write. TRUSTED_PROXY_HOPS = extra proxies in front.
export async function clientIp() {
  const h = await headers();
  const cf = h.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const hops = Math.max(0, Number(process.env.TRUSTED_PROXY_HOPS ?? 0) || 0);
  if (chain.length) return chain[Math.max(0, chain.length - 1 - hops)];
  return h.get("x-real-ip")?.trim() || "unknown";
}

const recent = (key: string, windowMs: number) => (hits.get(key) ?? []).filter((t) => Date.now() - t < windowMs);

// Notes one try for this key.
export function hit(key: string) {
  const now = Date.now();
  hits.set(key, [...(hits.get(key) ?? []).filter((t) => now - t < 24 * 3600_000), now]);
  // Now and then, forget old keys.
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k);
}

// True if this key already has `max` tries in the last `windowMs`.
export const blocked = (key: string, max: number, windowMs: number) => recent(key, windowMs).length >= max;

// True if still under the limit; counts this try.
export function allow(key: string, max: number, windowMs: number) {
  if (blocked(key, max, windowMs)) return false;
  hit(key);
  return true;
}

export const TOO_MANY = "Too many tries from this device. Please wait 15 minutes and try again.";
