"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { confirmOne, setRoleOne, suspendOne, unsuspendOne } from "@/lib/members";
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
  const rows = list.length ? await db.select({ id: users.id, name: users.name, role: users.role, confirmed: users.confirmed, suspendedAt: users.suspendedAt }).from(users).where(inArray(users.id, list)) : [];
  const res = await runEach(list, (id) => rows.find((r) => r.id === id)?.name ?? "Member", async (id) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return "Not found.";
    if (r.suspendedAt) return "Suspended. Lift that first.";
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

export type AdminFormState = { error?: string; done?: string } | undefined;

// The Vouchly admin only. Ward contacts can confirm, but not suspend or change roles.
async function adminOnly() {
  const me = await currentUser();
  return me?.role === "admin" ? me : null;
}

export async function suspendMember(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const me = await adminOnly();
  if (!me) return { error: "Only the Vouchly admin can suspend people." };
  const res = await suspendOne(me.id, String(form.get("id") ?? ""), String(form.get("reason") ?? ""));
  if ("error" in res) return { error: res.error };
  revalidatePath(MEMBERS_PAGE);
  return { done: res.openOrders ? `Suspended. Their shop has ${res.openOrders} open ${res.openOrders === 1 ? "order" : "orders"}: check them in Problems or with the buyers.` : "Suspended. They've been signed out and their shop is closed." };
}

export async function liftSuspension(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const me = await adminOnly();
  if (!me) return { error: "Only the Vouchly admin can do this." };
  const res = await unsuspendOne(me.id, String(form.get("id") ?? ""));
  if (res.error) return { error: res.error };
  revalidatePath(MEMBERS_PAGE);
  return { done: "Suspension lifted. They can sign in again." };
}

export async function changeRole(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const me = await adminOnly();
  if (!me) return { error: "Only the Vouchly admin can change roles." };
  const res = await setRoleOne(me.id, String(form.get("id") ?? ""), String(form.get("role") ?? ""));
  if (res.error) return { error: res.error };
  revalidatePath(MEMBERS_PAGE);
  return { done: "Role changed. They've been told." };
}
