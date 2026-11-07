"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { basketCount, readBasket, writeBasket } from "@/lib/basket";

export type BasketResult =
  | { ok: true; count: number; totalKobo: number }
  | { ok: false; conflict?: string; error?: string };

// Sets how many of a product are in the basket (0 removes it).
export async function setBasketQty(productId: string, qty: number, replace = false): Promise<BasketResult> {
  await requireUser();
  if (!/^[0-9a-f-]{36}$/.test(productId) || !Number.isInteger(qty) || qty < 0 || qty > 99) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  const [row] = await db
    .select({ shopId: products.shopId, shopName: shops.name, open: shops.isOpen })
    .from(products)
    .innerJoin(shops, eq(shops.id, products.shopId))
    .where(and(eq(products.id, productId), eq(products.kind, "item"), eq(products.isActive, true), eq(products.removed, false)))
    .limit(1);
  if (!row) return { ok: false, error: "This product isn't available any more." };
  if (!row.open) return { ok: false, error: "This shop is closed for now." };

  let basket = await readBasket();
  if (basket && basket.shopId !== row.shopId && qty > 0) {
    if (!replace) {
      const [other] = await db.select({ name: shops.name }).from(shops).where(eq(shops.id, basket.shopId)).limit(1);
      return { ok: false, conflict: other?.name ?? "another shop" };
    }
    basket = null;
  }
  basket = basket ?? { shopId: row.shopId, items: {} };
  if (qty === 0) delete basket.items[productId];
  else basket.items[productId] = qty;
  await writeBasket(basket);

  revalidatePath("/basket");
  return { ok: true, count: basketCount(basket), totalKobo: await basketTotal(basket.items) };
}

export async function clearBasket(): Promise<void> {
  await requireUser();
  await writeBasket(null);
  revalidatePath("/basket");
}

async function basketTotal(items: Record<string, number>) {
  const ids = Object.keys(items);
  if (!ids.length) return 0;
  const rows = await db
    .select({ id: products.id, price: products.priceKobo })
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.isActive, true), eq(products.removed, false)));
  return rows.reduce((sum, r) => sum + r.price * (items[r.id] ?? 0), 0);
}
