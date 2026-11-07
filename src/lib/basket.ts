import "server-only";
import { cookies } from "next/headers";

// The basket lives in a cookie: one shop at a time, product id → quantity.
export type Basket = { shopId: string; items: Record<string, number> };

const COOKIE = "vl_basket";

export async function readBasket(): Promise<Basket | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Basket;
    if (typeof b.shopId !== "string" || typeof b.items !== "object") return null;
    return Object.keys(b.items).length ? b : null;
  } catch {
    return null;
  }
}

export async function writeBasket(b: Basket | null) {
  const jar = await cookies();
  if (!b || !Object.keys(b.items).length) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, JSON.stringify(b), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}

export const basketCount = (b: Basket | null) => (b ? Object.values(b.items).reduce((a, n) => a + n, 0) : 0);
