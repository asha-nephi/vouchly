import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";

export const cleanCode = (raw: unknown) =>
  String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);

// How much a code takes off, for this shop and amount.
export async function discountFor(shopId: string, raw: unknown, itemsKobo: number): Promise<{ kobo: number; code: string | null } | { error: string }> {
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
  const kobo = d.percentOff ? Math.round((itemsKobo * d.percentOff) / 100) : Math.min(d.amountOffKobo ?? 0, itemsKobo);
  // Paystack needs something to charge, so a code can't make it free.
  if (itemsKobo - kobo < 100_00) return { error: `The code “${code}” can't bring the price below ₦100.` };
  return { kobo, code };
}

// Counts a use once the order is paid.
export async function markCodeUsed(shopId: string, code: string | null) {
  if (!code) return;
  await db
    .update(discountCodes)
    .set({ used: sql`${discountCodes.used} + 1` })
    .where(and(eq(discountCodes.shopId, shopId), eq(discountCodes.code, code)));
}
