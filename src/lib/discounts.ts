import "server-only";
import { and, eq, gte, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes, orders } from "@/db/schema";

export const cleanCode = (raw: unknown) =>
  String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);

// How much a code takes off, for this shop and amount.
export async function discountFor(shopId: string, raw: unknown, itemsKobo: number, buyerId?: string | null): Promise<{ kobo: number; code: string | null } | { error: string }> {
  const code = cleanCode(raw);
  if (!code) return { kobo: 0, code: null };
  const [d] = await db
    .select()
    .from(discountCodes)
    .where(and(eq(discountCodes.shopId, shopId), eq(discountCodes.code, code), eq(discountCodes.isActive, true)))
    .limit(1);
  if (!d) return { error: `“${code}” isn't a code for this shop.` };
  if (d.endsAt && d.endsAt.getTime() < Date.now()) return { error: `The code “${code}” has ended.` };
  if (d.maxUses && d.used >= d.maxUses) return { error: `The code “${code}” has been used up.` };
  if (d.maxUses && d.used + (await unpaidUses(shopId, code, buyerId)) >= d.maxUses) return { error: `The last uses of “${code}” are held by people paying now. Try again in 30 minutes.` };
  const kobo = d.percentOff ? Math.round((itemsKobo * d.percentOff) / 100) : Math.min(d.amountOffKobo ?? 0, itemsKobo);
  // Paystack needs something to charge, so a code can't make it free.
  if (itemsKobo - kobo < 100_00) return { error: `The code “${code}” can't bring the price below ₦100.` };
  return { kobo, code };
}

// Other people's orders from the last 30 minutes, still waiting for payment, hold a use of the code.
async function unpaidUses(shopId: string, code: string, buyerId?: string | null) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.shopId, shopId), eq(orders.discountCode, code), eq(orders.status, "awaiting_payment"), gte(orders.createdAt, new Date(Date.now() - 30 * 60_000)), buyerId ? ne(orders.buyerId, buyerId) : undefined));
  return row?.n ?? 0;
}

// Counts a use once the order is paid. One statement, so it never goes past the limit.
export async function markCodeUsed(shopId: string, code: string | null) {
  if (!code) return;
  await db
    .update(discountCodes)
    .set({ used: sql`${discountCodes.used} + 1` })
    .where(and(eq(discountCodes.shopId, shopId), eq(discountCodes.code, code), or(isNull(discountCodes.maxUses), lt(discountCodes.used, discountCodes.maxUses))));
}
