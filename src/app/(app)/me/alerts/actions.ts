"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// Turns email alerts on or off for the signed-in person only.
export async function setEmailAlerts(form: FormData): Promise<void> {
  const user = await requireUser();
  await db.update(users).set({ emailAlerts: form.get("on") === "1" }).where(eq(users.id, user.id));
  revalidatePath("/me/alerts");
  redirect("/me/alerts?saved=1");
}
