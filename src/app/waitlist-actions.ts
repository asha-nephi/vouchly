"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, waitlist } from "@/db/schema";
import { currentUser } from "@/lib/auth";

// Joins the waitlist for a sold-out listing, or leaves it.
export async function toggleWaitlist(form: FormData): Promise<void> {
  const me = await currentUser();
  if (!me || me.isGuest) redirect("/login");
  const productId = String(form.get("productId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(productId)) return;
  const [p] = await db.select({ id: products.id, kind: products.kind }).from(products).where(eq(products.id, productId)).limit(1);
  if (!p || (p.kind !== "item" && p.kind !== "event")) return;
  const gone = await db
    .delete(waitlist)
    .where(and(eq(waitlist.productId, productId), eq(waitlist.userId, me.id)))
    .returning({ userId: waitlist.userId });
  if (!gone.length) await db.insert(waitlist).values({ productId, userId: me.id }).onConflictDoNothing();
  revalidatePath(`/p/${productId}`);
}
