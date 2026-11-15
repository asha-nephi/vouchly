"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedShops, shops } from "@/db/schema";
import { currentUser } from "@/lib/auth";

// Saves a shop for this buyer, or un-saves it if already saved.
export async function toggleSavedShop(form: FormData): Promise<void> {
  const me = await currentUser();
  if (!me || me.isGuest) redirect("/login");
  const shopId = String(form.get("shopId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(shopId)) return;
  const [shop] = await db.select({ slug: shops.slug }).from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shop) return;
  const gone = await db
    .delete(savedShops)
    .where(and(eq(savedShops.userId, me.id), eq(savedShops.shopId, shopId)))
    .returning({ shopId: savedShops.shopId });
  if (!gone.length) await db.insert(savedShops).values({ userId: me.id, shopId }).onConflictDoNothing();
  revalidatePath(`/s/${shop.slug}`);
  revalidatePath("/me");
  revalidatePath("/home");
}
