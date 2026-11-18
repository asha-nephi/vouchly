"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { currentMember } from "@/lib/auth";
import { notifyMany } from "@/lib/notify";
import { myShop } from "@/lib/shops";
import { runEach, type BulkResult } from "@/components/data/bulk";
import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { loadAttendees, myEvent, PAID } from "./attendees-query";
import { ATTENDEE_COLUMN_IDS, ATTENDEE_COLUMNS, ATTENDEE_DEFAULT, ATTENDEES_PAGE } from "./attendee-columns";

const isCode = (c: unknown): c is string => typeof c === "string" && /^[A-Z]{2}-[0-9A-Z]{3,10}$/.test(c);

async function event(productId: string) {
  const me = await currentMember();
  const shop = me ? await myShop(me.id) : null;
  const p = shop ? await myEvent(shop.id, String(productId)) : null;
  return p && shop ? { shop, p } : null;
}

// Paid ticket orders for this event, by code.
async function ticketOrders(productId: string, codes: string[]) {
  if (!codes.length) return [];
  return db
    .select({ id: orders.id, code: orders.code, buyerId: orders.buyerId, status: orders.status, checkedInAt: orders.checkedInAt })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orderItems.productId, productId), eq(orders.method, "event"), inArray(orders.code, codes)));
}

const redraw = (productId: string) => revalidatePath(`/shop/manage/products/${productId}/attendees`);
const fail = (codes: string[], error: string): BulkResult => ({ done: 0, total: codes.length, failed: codes.map((id) => ({ id, label: id, error })) });

// The tick box in the row: checked in at the door, or not.
export async function setCheckIn(productId: string, code: string, on: boolean): Promise<{ error?: string; text?: string }> {
  const e = await event(productId);
  if (!e) return { error: "Please log in again." };
  if (!isCode(code)) return { error: "We couldn't find that ticket." };
  const [o] = await ticketOrders(e.p.id, [code]);
  if (!o) return { error: "We couldn't find that ticket." };
  if (!(PAID as readonly string[]).includes(o.status)) return { error: "This ticket isn't paid for yet." };
  await db.update(orders).set({ checkedInAt: on ? new Date() : null }).where(eq(orders.id, o.id));
  redraw(e.p.id);
  return { text: on ? "Checked in." : "Check-in taken off." };
}

export async function bulkCheckIn(productId: string, ids: string[]) {
  const codes = (Array.isArray(ids) ? ids : []).filter(isCode).slice(0, 100);
  const e = await event(productId);
  if (!e) return fail(codes, "Please log in again.");
  const list = await ticketOrders(e.p.id, codes);
  const res = await runEach(codes, (c) => c, async (c) => {
    const o = list.find((x) => x.code === c);
    if (!o) return "Not found for this event.";
    if (!(PAID as readonly string[]).includes(o.status)) return "Not paid yet.";
    if (!o.checkedInAt) await db.update(orders).set({ checkedInAt: new Date() }).where(eq(orders.id, o.id));
    return null;
  });
  redraw(e.p.id);
  return res;
}

// A message to the ticked people only. It goes under their bell, like "Message everyone".
export async function bulkMessage(productId: string, ids: string[], text?: string) {
  const codes = (Array.isArray(ids) ? ids : []).filter(isCode).slice(0, 100);
  const body = String(text ?? "").trim().slice(0, 600);
  const e = await event(productId);
  if (!e) return fail(codes, "Please log in again.");
  if (body.length < 3) return fail(codes, "Please write your message.");
  const list = await ticketOrders(e.p.id, codes);
  const res = await runEach(codes, (c) => c, async (c) => {
    const o = list.find((x) => x.code === c);
    if (!o) return "Not found for this event.";
    const sent = await notifyMany([{ userId: o.buyerId, title: `${e.p.name}: message from ${e.shop.name}`, body, link: `/orders/${o.code}` }]);
    return sent ? null : "Couldn't send. Try again.";
  });
  return res;
}

// CSV of the people the filters show (or just the ticked ones).
export async function exportAttendees(productId: string, query: string, codes?: string[]): Promise<string | null> {
  const e = await event(productId);
  if (!e) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const pick = Array.isArray(codes) && codes.length ? codes.filter(isCode).slice(0, 500) : undefined;
  const { rows } = await loadAttendees(e.p.id, sp, { all: true, codes: pick });
  const visible = await getColumns(ATTENDEES_PAGE, ATTENDEE_COLUMN_IDS, ATTENDEE_DEFAULT);
  return toCsv(ATTENDEE_COLUMNS, rows, visible);
}
