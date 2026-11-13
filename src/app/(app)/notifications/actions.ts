"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireBuyer } from "@/lib/auth";

export async function markAllRead(): Promise<void> {
  const user = await requireBuyer();
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
  revalidatePath("/notifications");
}
