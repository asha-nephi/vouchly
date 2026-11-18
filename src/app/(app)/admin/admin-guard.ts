import "server-only";
import { redirect } from "next/navigation";
import { currentUser, requireUser } from "@/lib/auth";

// Pages: only the Vouchly admin. Others go home.
export async function adminOnly() {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/home");
  return me;
}

// Server actions: the admin, or null.
export async function adminOrNull() {
  const me = await currentUser();
  return me?.role === "admin" ? me : null;
}

// First day of this Lagos month, as a moment in time.
export function monthStart(now = new Date()) {
  const lagos = new Date(now.getTime() + 3600_000);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), 1) - 3600_000);
}
