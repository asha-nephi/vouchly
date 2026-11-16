"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedViews } from "@/db/schema";
import { currentMember } from "@/lib/auth";
import { DENSITY_COOKIE } from "./density";
import { COLUMNS, MAX_VIEWS, listViews } from "./views";

const cleanPage = (p: unknown) => String(p ?? "").slice(0, 80);
// Redraw the page the person is on (only our own paths).
const redraw = (p: unknown) => {
  const path = String(p ?? "");
  if (/^\/[a-z0-9/_-]*$/i.test(path) && !path.startsWith("//")) revalidatePath(path);
};

// Comfortable / Compact. A cookie so the server draws the right size with no flash.
export async function setDensity(form: FormData) {
  const d = form.get("density");
  if (d !== "compact" && d !== "comfortable") return;
  (await cookies()).set(DENSITY_COOKIE, d, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
}

export type ViewState = { error?: string; ok?: boolean };

// Save the current filters under a name. Up to 5 per page; the same name is replaced.
export async function saveView(_: ViewState, form: FormData): Promise<ViewState> {
  const me = await currentMember();
  if (!me) return { error: "Please log in again." };
  const page = cleanPage(form.get("page"));
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const query = String(form.get("query") ?? "").slice(0, 1000);
  if (!page) return { error: "Something went wrong. Refresh and try again." };
  if (!name) return { error: "Give this view a name." };
  if (name === COLUMNS) return { error: "Pick another name." };
  const views = await listViews(page);
  if (!views.some((v) => v.name === name) && views.length >= MAX_VIEWS) return { error: `You can save up to ${MAX_VIEWS} views. Remove one first.` };
  await db
    .insert(savedViews)
    .values({ userId: me.id, page, name, query })
    .onConflictDoUpdate({ target: [savedViews.userId, savedViews.page, savedViews.name], set: { query } });
  redraw(form.get("path"));
  return { ok: true };
}

export async function deleteView(form: FormData) {
  const me = await currentMember();
  if (!me) return;
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.delete(savedViews).where(and(eq(savedViews.id, id), eq(savedViews.userId, me.id)));
  redraw(form.get("path"));
}

export async function saveColumns(page: string, ids: string[]): Promise<{ ok: boolean }> {
  const me = await currentMember();
  const p = cleanPage(page);
  const clean = ids.map((i) => String(i).slice(0, 40)).filter((i) => /^[a-z0-9_]+$/i.test(i)).slice(0, 30);
  if (!me || !p || !clean.length) return { ok: false };
  const query = clean.join(",");
  await db
    .insert(savedViews)
    .values({ userId: me.id, page: p, name: COLUMNS, query })
    .onConflictDoUpdate({ target: [savedViews.userId, savedViews.page, savedViews.name], set: { query } });
  return { ok: true };
}
