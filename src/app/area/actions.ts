"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AREAS } from "@/lib/catalog";

export async function setArea(form: FormData): Promise<void> {
  const user = await requireUser();
  const area = String(form.get("area") ?? "");
  if (AREAS.includes(area as (typeof AREAS)[number])) {
    await db.update(users).set({ area }).where(eq(users.id, user.id));
  }
  redirect("/home");
}
