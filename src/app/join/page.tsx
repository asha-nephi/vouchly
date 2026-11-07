import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import JoinForm from "./join-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account · Vouchly" };

// Invite links open here with ?code=, so the code is filled in.
export default async function Join({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  if (await currentUser()) redirect("/home");
  const raw = (await searchParams).code ?? "";
  const code = /^[A-Za-z0-9]{4,12}$/.test(raw) ? raw.toUpperCase() : "";
  const [inviter] = code ? await db.select({ name: users.name }).from(users).where(eq(users.inviteCode, code)).limit(1) : [];
  return <JoinForm code={inviter ? code : undefined} inviter={inviter?.name.split(" ")[0]} />;
}
