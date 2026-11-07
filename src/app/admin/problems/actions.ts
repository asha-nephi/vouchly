"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { refundOrder } from "@/lib/after-order";
import { notify } from "@/lib/notify";

export type ProblemState = { error?: string } | undefined;

// Only the Vouchly admin settles problems. Ward leaders don't.
async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/home");
  return user;
}

export async function resolveProblem(_: ProblemState, form: FormData): Promise<ProblemState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const choice = String(form.get("choice") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  const [o] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.status, "disputed"))).limit(1);
  if (!o) return { error: "This problem is already settled." };

  if (choice === "refund") {
    const res = await refundOrder(o.id, "Refunded after your problem report");
    if (res.error) return res;
    await db.update(orders).set({ problemResolution: note || "Vouchly refunded you in full." }).where(eq(orders.id, o.id));
  } else if (choice === "seller") {
    await db.update(orders).set({ status: "received", receivedAt: new Date(), problemResolution: note || "Vouchly looked into it and closed the order." }).where(eq(orders.id, o.id));
    await db.update(payments).set({ releaseAt: new Date() }).where(and(eq(payments.orderId, o.id), eq(payments.status, "held")));
    const [shop] = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, o.shopId));
    await notify(o.buyerId, "Problem closed", note || `Vouchly closed the problem on order ${o.code}.`, `/orders/${o.code}`);
    if (shop) await notify(shop.ownerId, "Problem closed", `The problem on order ${o.code} was closed. You keep the payment.`, `/shop/manage/orders/${o.code}`);
  } else {
    return { error: "Please pick what to do." };
  }
  revalidatePath("/admin/problems");
  return undefined;
}
