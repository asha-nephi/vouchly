"use server";

import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { adminOrNull } from "../admin-guard";
import { loadPayments } from "./payments-query";
import { PAYMENT_COLUMN_IDS, PAYMENT_COLUMNS, PAYMENT_DEFAULT, PAYMENTS_PAGE } from "./payment-columns";

// CSV of the payments the filters show (or just the ticked ones), to check against Paystack.
export async function exportPayments(query: string, ids?: string[]): Promise<string | null> {
  if (!(await adminOrNull())) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const pick = Array.isArray(ids) && ids.length ? ids.filter((id) => /^[0-9a-f-]{36}$/.test(String(id))).slice(0, 500) : undefined;
  const { rows } = await loadPayments(sp, { all: true, ids: pick });
  return toCsv(PAYMENT_COLUMNS, rows, await getColumns(PAYMENTS_PAGE, PAYMENT_COLUMN_IDS, PAYMENT_DEFAULT));
}
