import "server-only";
import { basketCount, readBasket } from "./basket";
import { productsByIds } from "./browse";

// What a page needs to start the basket controls: quantities, count and total.
export async function basketStart() {
  const b = await readBasket();
  if (!b) return { qty: {}, count: 0, totalKobo: 0, shopId: null as string | null };
  const rows = await productsByIds(Object.keys(b.items));
  const totalKobo = rows.reduce((s, r) => s + (r.product.isActive && !r.product.removed ? r.product.priceKobo * (b.items[r.product.id] ?? 0) : 0), 0);
  return { qty: b.items, count: basketCount(b), totalKobo, shopId: b.shopId };
}
