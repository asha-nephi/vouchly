"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { toKobo } from "@/lib/catalog";
import { cleanCode } from "@/lib/discounts";
import { myShop } from "@/lib/shops";

export type DiscountState = { error?: string; values?: Record<string, string>; done?: boolean } | undefined;

async function shopOrNull() {
  const user = await requireUser();
  return myShop(user.id);
}

export async function createDiscount(_: DiscountState, form: FormData): Promise<DiscountState> {
  const shop = await shopOrNull();
  if (!shop) return { error: "Open a shop first." };
  const values = {
    code: String(form.get("code") ?? ""),
    type: form.get("type") === "amount" ? "amount" : "percent",
    value: String(form.get("value") ?? "").trim(),
    maxUses: String(form.get("maxUses") ?? "").trim(),
    endsOn: String(form.get("endsOn") ?? "").trim(),
  };
  const fail = (error: string): DiscountState => ({ error, values });
  const code = cleanCode(values.code);
  if (code.length < 3) return fail("Codes need at least 3 letters or numbers, like WELCOME10.");
  let percentOff: number | null = null;
  let amountOffKobo: number | null = null;
  if (values.type === "percent") {
    const n = Number(values.value);
    if (!Number.isInteger(n) || n < 1 || n > 90) return fail("Percent off should be a whole number from 1 to 90.");
    percentOff = n;
  } else {
    amountOffKobo = toKobo(values.value);
    if (!amountOffKobo) return fail("Please enter the naira amount off, like 500.");
  }
  const maxUses = values.maxUses ? Number(values.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return fail("Uses should be a whole number, like 20, or left empty.");
  let endsAt: Date | null = null;
  if (values.endsOn) {
    endsAt = new Date(Date.parse(`${values.endsOn}T23:59:59+01:00`));
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() < Date.now()) return fail("The end date must be today or later.");
  }
  const [clash] = await db.select({ id: discountCodes.id }).from(discountCodes).where(and(eq(discountCodes.shopId, shop.id), eq(discountCodes.code, code))).limit(1);
  if (clash) return fail(`You already have a code called ${code}.`);
  await db.insert(discountCodes).values({ shopId: shop.id, code, percentOff, amountOffKobo, maxUses, endsAt });
  revalidatePath("/shop/manage/discounts");
  return { done: true };
}

export async function toggleDiscount(form: FormData): Promise<void> {
  const shop = await shopOrNull();
  if (!shop) return;
  const id = String(form.get("id") ?? "");
  const [d] = await db.select().from(discountCodes).where(and(eq(discountCodes.id, id), eq(discountCodes.shopId, shop.id))).limit(1);
  if (!d) return;
  await db.update(discountCodes).set({ isActive: !d.isActive }).where(eq(discountCodes.id, d.id));
  revalidatePath("/shop/manage/discounts");
}
