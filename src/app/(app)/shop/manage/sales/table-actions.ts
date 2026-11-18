"use server";

import { currentMember } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { loadSales } from "./sales-query";
import { SALE_COLUMN_IDS, SALE_COLUMNS, SALE_DEFAULT, SALES_PAGE } from "./sale-columns";

// CSV of the payments the filters show (or just the ticked ones), in the seller's columns.
export async function exportSales(query: string, codes?: string[]): Promise<string | null> {
  const me = await currentMember();
  const shop = me ? await myShop(me.id) : null;
  if (!shop) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const ids = Array.isArray(codes) && codes.length ? codes.map(String).slice(0, 500) : undefined;
  const { rows } = await loadSales(shop.id, sp, { all: true, codes: ids });
  const visible = await getColumns(SALES_PAGE, SALE_COLUMN_IDS, SALE_DEFAULT);
  return toCsv(SALE_COLUMNS, rows, visible);
}
