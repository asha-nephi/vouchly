"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// Buyer confirms they got their order.
export async function markReceived(form: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(form.get("code") ?? "");
  const [order] = await db
    .update(orders)
    .set({ status: "received", receivedAt: new Date() })
    .where(and(eq(orders.code, code), eq(orders.buyerId, user.id), inArray(orders.status, ["paid", "confirmed", "preparing", "ready", "on_the_way"])))
    .returning({ id: orders.id });
  // In hold mode this is the moment the seller's money is released.
  if (order) {
    await db
      .update(payments)
      .set({ releaseAt: new Date() })
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "held")));
  }
  revalidatePath(`/orders/${code}`);
}
