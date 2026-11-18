"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { currentMember } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { runEach } from "@/components/data/bulk";
import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { finished, loadDiscounts } from "./discounts-query";
import { DISCOUNT_COLUMN_IDS, DISCOUNT_COLUMNS, DISCOUNT_DEFAULT, DISCOUNTS_PAGE } from "./discount-columns";

const isId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

async function shop() {
  const me = await currentMember();
  return me ? myShop(me.id) : null;
}

// Switch many codes on or off. Finished codes can't come back on.
async function setMany(ids: string[], on: boolean) {
  const s = await shop();
  const list = Array.isArray(ids) ? ids.filter(isId).slice(0, 100) : [];
  if (!s) return { done: 0, total: list.length, failed: [] };
  const rows = list.length
    ? await db
        .select()
        .from(discountCodes)
        .where(and(eq(discountCodes.shopId, s.id), inArray(discountCodes.id, list)))
    : [];
  const name = (id: string) => rows.find((r) => r.id === id)?.code ?? "Code";
  const res = await runEach(list, name, async (id) => {
    const c = rows.find((r) => r.id === id);
    if (!c) return "Not found in your shop.";
    if (on && finished(c)) return "This code has ended or is used up.";
    if (c.isActive !== on) await db.update(discountCodes).set({ isActive: on }).where(eq(discountCodes.id, c.id));
    return null;
  });
  revalidatePath(DISCOUNTS_PAGE);
  return res;
}

export async function bulkOff(ids: string[]) {
  return setMany(ids, false);
}

export async function bulkOn(ids: string[]) {
  return setMany(ids, true);
}

// CSV of the codes the filters show (or just the ticked ones), in the seller's columns.
export async function exportDiscounts(query: string, ids?: string[]): Promise<string | null> {
  const s = await shop();
  if (!s) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const pick = Array.isArray(ids) && ids.length ? ids.filter(isId).slice(0, 500) : undefined;
  const { rows } = await loadDiscounts(s.id, sp, { all: true, ids: pick });
  const visible = await getColumns(DISCOUNTS_PAGE, DISCOUNT_COLUMN_IDS, DISCOUNT_DEFAULT);
  return toCsv(DISCOUNT_COLUMNS, rows, visible);
}
