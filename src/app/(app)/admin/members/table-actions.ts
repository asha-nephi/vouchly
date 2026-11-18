"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { confirmOne } from "@/lib/members";
import { runEach, type BulkResult } from "@/components/data/bulk";
import { toCsv } from "@/components/data/csv";
import { getColumns } from "@/components/data/views";
import { loadMembers } from "./members-query";
import { MEMBER_COLUMN_IDS, MEMBER_DEFAULT, MEMBERS_PAGE, memberColumns } from "./member-columns";

const isId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

// Ward contacts and the admin can confirm members.
async function leader() {
  const me = await currentUser();
  return me && (me.role === "admin" || me.role === "ward_contact") ? me : null;
}

export async function bulkConfirm(ids: string[]): Promise<BulkResult> {
  const list = (Array.isArray(ids) ? ids : []).filter(isId).slice(0, 100);
  const me = await leader();
  if (!me) return { done: 0, total: list.length, failed: list.map((id) => ({ id, label: "Member", error: "Only ward contacts and the admin can confirm." })) };
  const rows = list.length ? await db.select({ id: users.id, name: users.name, role: users.role, confirmed: users.confirmed }).from(users).where(inArray(users.id, list)) : [];
  const res = await runEach(list, (id) => rows.find((r) => r.id === id)?.name ?? "Member", async (id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return "Not found.";
    if (r.role !== "member" || r.confirmed) return "Already confirmed.";
    return (await confirmOne(me.id, id)) ? null : "Couldn't confirm. Try again.";
  });
  revalidatePath(MEMBERS_PAGE);
  return res;
}

// CSV of the members the filters show (or just the ticked ones).
export async function exportMembers(query: string, ids?: string[]): Promise<string | null> {
  const me = await leader();
  if (!me) return null;
  const sp = Object.fromEntries(new URLSearchParams(String(query).slice(0, 2000)));
  const pick = Array.isArray(ids) && ids.length ? ids.filter(isId).slice(0, 500) : undefined;
  const { rows } = await loadMembers(sp, { all: true, ids: pick });
  const visible = await getColumns(MEMBERS_PAGE, MEMBER_COLUMN_IDS, MEMBER_DEFAULT);
  return toCsv(memberColumns(me.role === "admin"), rows, visible);
}
