import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { memberLog, orders, sessions, shops, users } from "@/db/schema";
import { notify } from "@/lib/notify";

const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);
const OPEN_ORDERS = ["paid", "confirmed", "preparing", "ready", "on_the_way", "disputed", "requested", "quoted"] as const;
export const ROLE_NAME = { member: "Member", ward_contact: "Ward contact", admin: "Admin", buyer: "Buyer" } as const;

// Writes one line to the member's history.
async function log(userId: string, byId: string, action: string, detail?: string) {
  await db.insert(memberLog).values({ userId, byId, action, detail: detail ?? null });
}

// Confirms one waiting member and opens their shop. Records who confirmed them and when.
export async function confirmOne(meId: string, id: string): Promise<boolean> {
  if (!isId(id)) return false;
  const [done] = await db
    .update(users)
    .set({ confirmed: true, confirmedById: meId, confirmedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.role, "member"), eq(users.confirmed, false), isNull(users.suspendedAt)))
    .returning({ id: users.id });
  if (done) {
    await log(id, meId, "confirmed");
    // A shop built while waiting goes live now.
    const [shop] = await db.update(shops).set({ isOpen: true }).where(eq(shops.ownerId, id)).returning({ id: shops.id });
    await notify(
      id,
      "You're confirmed",
      shop ? "Your shop is now live. Share it on WhatsApp to get your first order." : "You can now open your shop on Vouchly.",
      shop ? "/shop/manage" : "/sell",
    ).catch((e) => console.error("Confirm notice failed.", e instanceof Error ? e.message : e));
  }
  return !!done;
}

// Admin only. Signs them out everywhere, closes their shop and stops their invite code.
// Returns an error in plain words, or how many orders are still open with their shop.
export async function suspendOne(meId: string, id: string, reason: string): Promise<{ error: string } | { openOrders: number }> {
  if (!isId(id)) return { error: "We couldn't find that member." };
  if (id === meId) return { error: "You can't suspend yourself." };
  const why = reason.trim().slice(0, 300);
  if (why.length < 3) return { error: "Please say why, in a few words. Only admins see this." };
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u || u.isGuest) return { error: "We couldn't find that member." };
  if (u.role === "admin") return { error: "Admins can't be suspended here." };
  if (u.suspendedAt) return { error: "Already suspended." };
  const [shop] = await db.select({ id: shops.id, isOpen: shops.isOpen }).from(shops).where(eq(shops.ownerId, id)).limit(1);
  await db.update(users).set({ suspendedAt: new Date(), suspendedReason: why, suspendedById: meId, suspendedShopWasOpen: !!shop?.isOpen }).where(eq(users.id, id));
  if (shop) await db.update(shops).set({ isOpen: false }).where(eq(shops.id, shop.id));
  await db.delete(sessions).where(eq(sessions.userId, id));
  await log(id, meId, "suspended", why);
  const open = shop ? await db.select({ id: orders.id }).from(orders).where(and(eq(orders.shopId, shop.id), inArray(orders.status, [...OPEN_ORDERS]))) : [];
  return { openOrders: open.length };
}

// Admin only. They can sign in again, and their shop reopens if it was open before.
export async function unsuspendOne(meId: string, id: string): Promise<{ error?: string }> {
  if (!isId(id)) return { error: "We couldn't find that member." };
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u || !u.suspendedAt) return { error: "This member isn't suspended." };
  await db.update(users).set({ suspendedAt: null, suspendedReason: null, suspendedById: null, suspendedShopWasOpen: false }).where(eq(users.id, id));
  if (u.suspendedShopWasOpen && (u.confirmed || u.role !== "member")) await db.update(shops).set({ isOpen: true }).where(eq(shops.ownerId, id));
  await log(id, meId, "unsuspended");
  await notify(id, "Your account is active again", "You can sign in and use Vouchly as before.", "/home").catch(() => null);
  return {};
}

// Admin only. Member and ward contact can swap. Nobody becomes an admin from the screen.
export async function setRoleOne(meId: string, id: string, role: string): Promise<{ error?: string }> {
  if (!isId(id)) return { error: "We couldn't find that member." };
  if (id === meId) return { error: "You can't change your own role." };
  if (role !== "member" && role !== "ward_contact") return { error: "Pick Member or Ward contact." };
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u || u.isGuest || (u.role !== "member" && u.role !== "ward_contact")) return { error: "Only members and ward contacts can be changed here." };
  if (u.role === role) return { error: `Already a ${ROLE_NAME[role].toLowerCase()}.` };
  if (u.suspendedAt) return { error: "Lift the suspension first." };
  if (role === "ward_contact" && !u.confirmed) return { error: "Confirm them as a member first." };
  await db.update(users).set({ role }).where(eq(users.id, id));
  await log(id, meId, "role", `${ROLE_NAME[u.role]} → ${ROLE_NAME[role]}`);
  await notify(
    id,
    role === "ward_contact" ? "You're now a ward contact" : "Your role changed",
    role === "ward_contact" ? "You can now confirm new members from your ward. Open Members from your Me page." : "You're now a member. Ward contact pages are no longer shown to you.",
    "/me",
  ).catch(() => null);
  return {};
}

// The member's history, newest first, with who did each thing.
export async function memberHistory(id: string) {
  if (!isId(id)) return [];
  const rows = await db.select().from(memberLog).where(eq(memberLog.userId, id));
  const ids = [...new Set(rows.map((r) => r.byId).filter((x): x is string => !!x))];
  const names = ids.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids)) : [];
  return rows
    .map((r) => ({ ...r, by: names.find((n) => n.id === r.byId)?.name ?? null }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);
}
