import "server-only";
import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, waitlist } from "@/db/schema";
import { notifyMany } from "./notify";
import { ticketsTaken } from "./sessions";

const HOLD_MINS = 30;

// Items held by other people's unpaid orders from the last 30 minutes.
export async function heldByOthers(productIds: string[], buyerId?: string) {
  if (!productIds.length) return new Map<string, number>();
  const rows = await db
    .select({ productId: orderItems.productId, n: sql<number>`sum(${orderItems.quantity})::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        inArray(orderItems.productId, productIds),
        eq(orders.status, "awaiting_payment"),
        gte(orders.createdAt, new Date(Date.now() - HOLD_MINS * 60_000)),
        buyerId ? ne(orders.buyerId, buyerId) : undefined,
      ),
    )
    .groupBy(orderItems.productId);
  return new Map(rows.map((r) => [r.productId!, r.n]));
}

// How many a buyer can still order. Null means no limit.
export async function stockLeft(p: { id: string; stock: number | null }, buyerId?: string) {
  if (p.stock === null) return null;
  const held = (await heldByOthers([p.id], buyerId)).get(p.id) ?? 0;
  return Math.max(0, p.stock - held);
}

// Takes paid items off the stock. False if something ran out first (nothing is changed then).
export async function takeStock(orderId: string) {
  const lines = await db.select({ productId: orderItems.productId, q: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, orderId));
  try {
    await db.transaction(async (tx) => {
      for (const l of lines) {
        if (!l.productId) continue;
        const [p] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, l.productId)).for("update");
        if (!p || p.stock === null) continue;
        if (p.stock < l.q) throw new Error("sold out");
        await tx.update(products).set({ stock: p.stock - l.q }).where(eq(products.id, l.productId));
      }
      await tx.update(orders).set({ stockTaken: true }).where(eq(orders.id, orderId));
    });
    return true;
  } catch (e) {
    if ((e as Error).message !== "sold out") throw e;
    return false;
  }
}

// Puts a cancelled order's items back on the stock, then tells anyone waiting.
export async function giveBackStock(orderId: string) {
  const [o] = await db.update(orders).set({ stockTaken: false }).where(and(eq(orders.id, orderId), eq(orders.stockTaken, true))).returning({ id: orders.id });
  const lines = await db.select({ productId: orderItems.productId, q: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const l of lines) {
    if (!l.productId) continue;
    if (o) await db.update(products).set({ stock: sql`${products.stock} + ${l.q}` }).where(and(eq(products.id, l.productId), sql`${products.stock} is not null`));
    await wakeWaitlist(l.productId);
  }
}

// If a listing can be bought again, tells everyone waiting and clears the list.
export async function wakeWaitlist(productId: string) {
  const waiting = await db.select({ userId: waitlist.userId }).from(waitlist).where(eq(waitlist.productId, productId));
  if (!waiting.length) return 0;
  const [p] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!p || !p.isActive || p.removed) return 0;
  if (p.kind === "item" && p.stock !== null && ((await stockLeft(p)) ?? 1) <= 0) return 0;
  if (p.kind === "event") {
    if (!p.seats || (p.eventAt && p.eventAt.getTime() < Date.now())) return 0;
    if (p.seats - (await ticketsTaken(p.id)) <= 0) return 0;
  }
  if (p.kind !== "item" && p.kind !== "event") return 0;
  const gone = await db.delete(waitlist).where(and(eq(waitlist.productId, productId), inArray(waitlist.userId, waiting.map((w) => w.userId)))).returning({ userId: waitlist.userId });
  const what = p.kind === "event" ? "A seat is free" : "Back in stock";
  const body = p.kind === "event" ? `${p.name} has a seat free again. Get your ticket before it goes.` : `${p.name} is back. Order soon before it sells out again.`;
  return notifyMany(gone.map((g) => ({ userId: g.userId, title: what, body, link: `/p/${p.id}` })));
}
