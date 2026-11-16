"use server";

import { currentMember } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { loadOrders } from "./orders-query";
import { ORDER_COLUMN_IDS, ORDER_COLUMNS, ORDER_DEFAULT, ORDERS_PAGE } from "./order-columns";

// CSV of the orders the filters show (or just the ticked ones), in the seller's columns.
export async function exportOrders(query: string, codes?: string[]): Promise<string | null> {
  const me = await currentMember();
  const shop = me ? await myShop(me.id) : null;
  if (!shop) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const ids = Array.isArray(codes) && codes.length ? codes.map(String).slice(0, 500) : undefined;
  const { rows } = await loadOrders(shop.id, sp, { all: true, codes: ids });
  const visible = await getColumns(ORDERS_PAGE, ORDER_COLUMN_IDS, ORDER_DEFAULT);
  return toCsv(ORDER_COLUMNS, rows, visible);
}
