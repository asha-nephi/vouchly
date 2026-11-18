import { escLike } from "@/lib/like";
import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { orders, sessions, shops, users } from "@/db/schema";
import { addDays, keyToDate, todayKey } from "@/lib/dates";
import { flat, tableState, type Params } from "@/components/data/params";

export const MEMBER_SORTS = ["name", "ward", "joined", "active"];
export const ROLE_FILTER = [
  { value: "member", label: "Member" },
  { value: "ward_contact", label: "Ward contact" },
  { value: "admin", label: "Admin" },
];
export const STATUS_FILTER = [
  { value: "waiting", label: "Waiting for confirmation" },
  { value: "confirmed", label: "Confirmed" },
];
export const SHOP_FILTER = [
  { value: "yes", label: "Has a shop" },
  { value: "no", label: "No shop" },
];
export const JOINED_FILTER = [
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];
export const ROLE_LABEL: Record<string, string> = { member: "Member", ward_contact: "Ward contact", admin: "Admin", buyer: "Buyer" };

// Wards people have joined from, for the filter.
export async function wardList() {
  const rows = await db
    .selectDistinct({ ward: users.ward })
    .from(users)
    .where(and(eq(users.isGuest, false), inArray(users.role, ["member", "ward_contact", "admin"])))
    .orderBy(asc(users.ward));
  return rows.map((r) => r.ward).filter(Boolean);
}

export type MemberRow = Awaited<ReturnType<typeof loadMembers>>["rows"][number];

// One page of members (not buyers or guests), with their shop and last sign-in.
export async function loadMembers(sp: Params, opts: { all?: boolean; ids?: string[] } = {}) {
  const f = flat(sp);
  const st = tableState(sp, { sorts: MEMBER_SORTS, sort: "joined" });
  const inviter = alias(users, "inviter");
  const lastActive = sql<Date | null>`(select max(${sessions.createdAt}) from ${sessions} where ${sessions.userId} = ${users.id})`.mapWith((v) => (v ? new Date(v) : null));
  const parts: (SQL | undefined)[] = [eq(users.isGuest, false), inArray(users.role, ["member", "ward_contact", "admin"])];
  if (f.role && ROLE_FILTER.some((r) => r.value === f.role)) parts.push(eq(users.role, f.role as "member"));
  if (f.status === "waiting") parts.push(eq(users.confirmed, false), eq(users.role, "member"));
  if (f.status === "confirmed") parts.push(or(eq(users.confirmed, true), inArray(users.role, ["ward_contact", "admin"])));
  if (f.shop === "yes") parts.push(isNotNull(shops.id));
  if (f.shop === "no") parts.push(isNull(shops.id));
  if (f.ward) parts.push(eq(users.ward, f.ward));
  if (f.joined === "week" || f.joined === "month") parts.push(gte(users.createdAt, keyToDate(addDays(todayKey(), f.joined === "week" ? -6 : -29))), lt(users.createdAt, keyToDate(addDays(todayKey(), 1))));
  if (st.q) {
    const digits = st.q.replace(/\D/g, "").replace(/^0/, "");
    parts.push(or(ilike(users.name, `%${escLike(st.q)}%`), ilike(users.email, `%${escLike(st.q)}%`), ilike(shops.name, `%${escLike(st.q)}%`), digits.length >= 4 ? ilike(users.phone, `%${digits}%`) : undefined));
  }
  if (opts.ids) parts.push(inArray(users.id, opts.ids.length ? opts.ids : ["00000000-0000-0000-0000-000000000000"]));
  const where = and(...parts);
  const col = { name: users.name, ward: users.ward, joined: users.createdAt, active: lastActive }[st.sort as "name"];
  const base = db
    .select({ u: users, shop: { id: shops.id, name: shops.name, slug: shops.slug, sellerType: shops.sellerType, isOpen: shops.isOpen }, invitedBy: inviter.name, lastActive })
    .from(users)
    .leftJoin(shops, eq(shops.ownerId, users.id))
    .leftJoin(inviter, eq(inviter.id, users.invitedById))
    .where(where)
    .orderBy(st.dir === "asc" ? sql`${col} asc nulls first` : sql`${col} desc nulls last`, desc(users.createdAt), asc(users.id));
  const [rows, [{ n }]] = await Promise.all([
    opts.all ? base.limit(5000) : base.limit(st.per).offset(st.offset),
    db.select({ n: sql<number>`count(*)::int` }).from(users).leftJoin(shops, eq(shops.ownerId, users.id)).where(where),
  ]);
  return { st, rows, total: n };
}

// Everything for the side panel: who invited and confirmed them, and their orders.
export async function memberDetail(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [row] = (await loadMembers({}, { all: true, ids: [id] })).rows;
  if (!row) return null;
  const confirmer = row.u.confirmedById ? (await db.select({ name: users.name }).from(users).where(eq(users.id, row.u.confirmedById)).limit(1))[0] : null;
  const inviter = row.u.invitedById ? (await db.select({ name: users.name, code: users.inviteCode }).from(users).where(eq(users.id, row.u.invitedById)).limit(1))[0] : null;
  const [[bought], [sold], [invited]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.buyerId, id), sql`${orders.status} <> 'awaiting_payment'`)),
    row.shop?.id ? db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.shopId, row.shop.id), sql`${orders.status} <> 'awaiting_payment'`)) : Promise.resolve([{ n: 0 }]),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.invitedById, id)),
  ]);
  return { ...row, confirmer: confirmer?.name ?? null, inviter, bought: bought.n, sold: sold.n, invited: invited.n };
}
