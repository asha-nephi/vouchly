import "server-only";
import { and, eq, gte, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { flat, tableState, type Params } from "@/components/data/params";

export const PAID = ["paid", "confirmed", "preparing", "ready", "on_the_way", "received", "disputed"] as const;
export const SHOW_FILTER = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Not paid yet" },
  { value: "in", label: "Checked in" },
  { value: "out", label: "Paid, not checked in" },
];
const UNPAID_DAYS = 7;

// The seller's own event, or null.
export async function myEvent(shopId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await db.select().from(products).where(and(eq(products.id, id), eq(products.shopId, shopId), eq(products.kind, "event"))).limit(1);
  return p ?? null;
}

export type AttendeeRow = Awaited<ReturnType<typeof loadAttendees>>["rows"][number];

// Everyone with a ticket, plus people who started paying in the last week. Events are small, so this is done in memory.
export async function loadAttendees(productId: string, sp: Params, opts: { all?: boolean; codes?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: ["name", "tickets", "ordered"], sort: "name", dir: "asc" });
  const since = new Date(Date.now() - UNPAID_DAYS * 86400_000);
  const list = await db
    .select({ code: orders.code, buyerId: orders.buyerId, status: orders.status, checkedInAt: orders.checkedInAt, at: orders.createdAt, amount: orders.itemsKobo, qty: orderItems.quantity, name: users.name, phone: users.phone, ward: users.ward, guest: users.isGuest })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(and(eq(orderItems.productId, productId), eq(orders.method, "event"), or(inArray(orders.status, [...PAID]), and(eq(orders.status, "awaiting_payment"), gte(orders.createdAt, since)))));
  let rows = list.map((r) => ({ ...r, pid: productId, paid: r.status !== "awaiting_payment" }));
  const counts = { tickets: rows.filter((r) => r.paid).reduce((n, r) => n + r.qty, 0), in: rows.filter((r) => r.checkedInAt).reduce((n, r) => n + r.qty, 0) };

  if (opts.codes) rows = rows.filter((r) => opts.codes!.includes(r.code));
  if (f.show === "paid") rows = rows.filter((r) => r.paid);
  if (f.show === "unpaid") rows = rows.filter((r) => !r.paid);
  if (f.show === "in") rows = rows.filter((r) => r.checkedInAt);
  if (f.show === "out") rows = rows.filter((r) => r.paid && !r.checkedInAt);
  if (st.q) {
    const q = st.q.toLowerCase();
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (digits.length >= 4 && r.phone.includes(digits)));
  }
  const key: Record<string, (r: (typeof rows)[number]) => number | string> = { name: (r) => r.name.toLowerCase(), tickets: (r) => r.qty, ordered: (r) => r.at.getTime() };
  const by = key[st.sort] ?? key.name;
  const dir = st.dir === "desc" ? -1 : 1;
  rows.sort((a, b) => {
    const x = by(a);
    const y = by(b);
    return x === y ? a.code.localeCompare(b.code) : (x < y ? -1 : 1) * dir;
  });
  const total = rows.length;
  return { st, rows: opts.all ? rows : rows.slice(st.offset, st.offset + st.per), total, counts };
}
