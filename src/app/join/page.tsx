import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentMember, currentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import JoinForm from "./join-form";
import { googleReady } from "@/lib/google";
import { emailReady } from "@/lib/email";
import PathChooser from "./path-chooser";
import { PATH_COOKIE, readPath } from "@/lib/seller-types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join Vouchly", description: "Buy from members you can trust, or sell with an invite from a member.", alternates: { canonical: "/join" } };

// Invite links open here with ?code=, so the code is filled in.
export default async function Join({ searchParams }: { searchParams: Promise<{ code?: string; from?: string; step?: string }> }) {
  if (await currentMember()) redirect("/home");
  const user = await currentUser();
  const existingBuyer = !!user && !user.isGuest && user.role === "buyer";
  const sp = await searchParams;
  const raw = sp.code ?? "";
  const code = /^[A-Za-z0-9]{4,12}$/.test(raw) ? raw.toUpperCase() : "";
  const [inviter] = code
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(and(eq(users.inviteCode, code), inArray(users.role, ["member", "ward_contact", "admin"]), eq(users.confirmed, true)))
        .limit(1)
    : [];
  // Step 1 picks a path. Selling paths then come here with ?step=details.
  const path = readPath((await cookies()).get(PATH_COOKIE)?.value);
  if (sp.step !== "details" || !path) {
    return <PathChooser code={inviter ? code : undefined} fromGuest={sp.from === "guest"} existingBuyer={existingBuyer} picked={path?.type} />;
  }
  return <JoinForm code={inviter ? code : undefined} inviter={inviter?.name.split(" ")[0]} fromGuest={sp.from === "guest"} existingBuyer={existingBuyer} googleEnabled={googleReady()} emailEnabled={emailReady()} />;
}
