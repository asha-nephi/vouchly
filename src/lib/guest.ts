import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser, makeInviteCode, startSession } from "./auth";
import { normalizePhone } from "./phone";

export type GuestValues = { guestName: string; guestPhone: string; guestEmail: string };

export const guestValues = (form: FormData): GuestValues => ({
  guestName: String(form.get("guestName") ?? "").trim().slice(0, 80),
  guestPhone: String(form.get("guestPhone") ?? "").trim().slice(0, 20),
  guestEmail: String(form.get("guestEmail") ?? "").trim().slice(0, 120),
});

// Who is buying: the signed-in person, or a new guest made from the form.
// Guests are tied to this device by a session, never looked up by phone,
// so typing someone else's number can't open their orders.
export async function buyerFor(form: FormData): Promise<{ user: typeof users.$inferSelect } | { error: string }> {
  const me = await currentUser();
  if (me) return { user: me };

  const v = guestValues(form);
  if (v.guestName.length < 2) return { error: "Please enter your name." };
  const phone = normalizePhone(v.guestPhone);
  if (!phone) return { error: "Please enter a valid Nigerian phone number, like 0803 123 4567." };
  if (v.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.guestEmail)) return { error: "Please check your email address." };
  const [member] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (member) return { error: "This number has a Vouchly account. Please log in first, then come back to buy." };

  const [guest] = await db
    .insert(users)
    .values({ name: v.guestName, phone, email: v.guestEmail || null, ward: "Guest", inviteCode: `G${makeInviteCode()}${makeInviteCode()}`, isGuest: true })
    .returning();
  await startSession(guest.id);
  return { user: guest };
}
