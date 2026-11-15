import "server-only";
import { cookies } from "next/headers";

// The basket lives in a cookie: one shop at a time, product id → quantity.
export type Basket = { shopId: string; items: Record<string, number> };

const COOKIE = "vl_basket";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const MAX_QTY = 99;
const MAX_LINES = 30;

// The cookie can be edited by hand, so keep only well-formed lines.
export function cleanBasket(raw: unknown): Basket | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as { shopId?: unknown; items?: unknown };
  if (typeof b.shopId !== "string" || !UUID.test(b.shopId)) return null;
  if (!b.items || typeof b.items !== "object" || Array.isArray(b.items)) return null;
  const items: Record<string, number> = {};
  for (const [id, qty] of Object.entries(b.items as Record<string, unknown>).slice(0, MAX_LINES)) {
    if (UUID.test(id) && typeof qty === "number" && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY) items[id] = qty;
  }
  return Object.keys(items).length ? { shopId: b.shopId, items } : null;
}

export async function readBasket(): Promise<Basket | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return cleanBasket(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeBasket(b: Basket | null) {
  const jar = await cookies();
  const clean = cleanBasket(b);
  if (!clean) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, JSON.stringify(clean), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}

export const basketCount = (b: Basket | null) => (b ? Object.values(b.items).reduce((a, n) => a + n, 0) : 0);
