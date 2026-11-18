"use server";

import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { adminOrNull } from "../admin-guard";
import { loadShops } from "./shops-query";
import { SHOP_COLUMN_IDS, SHOP_COLUMNS, SHOP_DEFAULT, SHOPS_PAGE } from "./shop-columns";

// CSV of the shops the filters show (or just the ticked ones).
export async function exportShops(query: string, ids?: string[]): Promise<string | null> {
  if (!(await adminOrNull())) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const pick = Array.isArray(ids) && ids.length ? ids.filter((id) => /^[0-9a-f-]{36}$/.test(String(id))).slice(0, 500) : undefined;
  const { rows } = await loadShops(sp, { all: true, ids: pick });
  return toCsv(SHOP_COLUMNS, rows, await getColumns(SHOPS_PAGE, SHOP_COLUMN_IDS, SHOP_DEFAULT));
}
