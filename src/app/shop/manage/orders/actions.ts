"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { toKobo } from "@/lib/catalog";
import { notify } from "@/lib/notify";
import { buyerMessage, sellerNext } from "@/lib/order-status";
import { normalizePhone } from "@/lib/phone";
import { refundOrder } from "@/lib/after-order";
import { myShop } from "@/lib/shops";

export type OrderFormState = { error?: string; values?: Record<string, string> } | undefined;

// Loads one of this seller's orders.
async function sellerOrder(code: string) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.code, code), eq(orders.shopId, shop.id)))
    .limit(1);
  if (!order) redirect("/shop/manage/orders");
  return { shop, order };
}

// Moves an order to its next step (not the rider step).
export async function advanceOrder(form: FormData): Promise<void> {
  const code = String(form.get("code") ?? "");
  const { shop, order } = await sellerOrder(code);
  const next = sellerNext(order.status, order.method);
  if (!next || next.rider || next.to !== form.get("to")) return;
  const done = await db
    .update(orders)
    .set({ status: next.to as typeof order.status })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
    .returning({ id: orders.id });
  if (done.length) await notify(order.buyerId, "Order update", buyerMessage(next.to, shop.name, order.method), `/orders/${code}`);
  revalidatePath(`/shop/manage/orders/${code}`);
}

// Saves the rider's details and marks the order on the way.
export async function sendRider(_: OrderFormState, form: FormData): Promise<OrderFormState> {
  const code = String(form.get("code") ?? "");
  const values = {
    riderName: String(form.get("riderName") ?? "").trim(),
    riderPhone: String(form.get("riderPhone") ?? "").trim(),
    riderCost: String(form.get("riderCost") ?? "").trim(),
    tracking: String(form.get("tracking") ?? "").trim(),
  };
  const fail = (error: string) => ({ error, values });
  const { shop, order } = await sellerOrder(code);
  if (order.method !== "rider" || !["confirmed", "preparing"].includes(order.status)) return fail("This order can't be sent with a rider now.");
  if (!values.riderName) return fail("Please add the rider's name.");
  const phone = normalizePhone(values.riderPhone);
  if (!phone) return fail("Please check the rider's phone number.");
  const cost = values.riderCost ? toKobo(values.riderCost) : null;
  if (values.riderCost && (cost === null || cost <= 0)) return fail("Please check the rider's fee.");
  if (values.tracking && !/^https:\/\/\S+$/.test(values.tracking)) return fail("The tracking link should start with https://");

  await db
    .update(orders)
    .set({ status: "on_the_way", riderName: values.riderName, riderPhone: phone, riderCostKobo: cost, riderTrackingUrl: values.tracking || null })
    .where(and(eq(orders.id, order.id), eq(orders.status, order.status)));
  await notify(order.buyerId, "Your rider is on the way", `${values.riderName} is bringing your order from ${shop.name}.`, `/orders/${code}`);
  revalidatePath(`/shop/manage/orders/${code}`);
  return undefined;
}

// Seller cancels (or agrees to a problem) and refunds the buyer in full.
export async function sellerRefund(_: OrderFormState, form: FormData): Promise<OrderFormState> {
  const code = String(form.get("code") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  const { order } = await sellerOrder(code);
  if (!["paid", "confirmed", "preparing", "ready", "on_the_way", "disputed"].includes(order.status)) return { error: "This order can't be refunded now." };
  if (!reason) return { error: "Please say why, so the buyer understands.", values: { reason } };
  const res = await refundOrder(order.id, reason);
  if (res.error) return { error: res.error, values: { reason } };
  if (order.status === "disputed") await db.update(orders).set({ problemResolution: "The seller refunded you." }).where(eq(orders.id, order.id));
  revalidatePath(`/shop/manage/orders/${code}`);
  return undefined;
}
