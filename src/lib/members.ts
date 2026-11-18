import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { shops, users } from "@/db/schema";
import { notify } from "@/lib/notify";

// Confirms one waiting member and opens their shop. Records who confirmed them and when.
export async function confirmOne(meId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const [done] = await db
    .update(users)
    .set({ confirmed: true, confirmedById: meId, confirmedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.role, "member"), eq(users.confirmed, false)))
    .returning({ id: users.id });
  if (done) {
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
