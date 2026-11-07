import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, shops, users } from "@/db/schema";
import { naira } from "./catalog";
import { makeOrderCode, ourShareKobo, payEmail } from "./orders";
import { initializePayment } from "./paystack";

const siteUrl = () => process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";

// A new unused order code.
export async function newOrderCode() {
  let code = makeOrderCode();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db.select({ id: orders.id }).from(orders).where(eq(orders.code, code)).limit(1);
    if (!clash) break;
    code = makeOrderCode();
  }
  return code;
}

// Saves a payment for the order and returns the Paystack page to send the buyer to.
export async function startPayment(p: {
  user: typeof users.$inferSelect;
  shop: typeof shops.$inferSelect;
  orderId: string;
  code: string;
  itemsKobo: number;
  totalKobo: number;
  cancelOnFail?: boolean;
}): Promise<{ url?: string; error?: string }> {
  const feeKobo = ourShareKobo(p.itemsKobo);
  const reference = `${p.code}-${Date.now().toString(36)}`;
  await db.insert(payments).values({ orderId: p.orderId, paystackReference: reference, amountKobo: p.totalKobo, feeKobo, sellerKobo: p.totalKobo - feeKobo });
  try {
    const res = await initializePayment({
      email: payEmail(p.user.phone, p.user.email),
      amountKobo: p.totalKobo,
      reference,
      callbackUrl: `${siteUrl()}/checkout/done`,
      subaccount: p.shop.paystackSubaccount,
      ourShareKobo: feeKobo,
      metadata: { order: p.code, shop: p.shop.name },
    });
    return { url: res.authorization_url };
  } catch {
    await db.delete(payments).where(eq(payments.paystackReference, reference));
    if (p.cancelOnFail !== false) await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, p.orderId));
    return { error: `We couldn't start the payment of ${naira(p.totalKobo)}. Please try again.` };
  }
}
