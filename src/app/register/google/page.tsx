import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens } from "@/db/schema";
import { hash } from "@/lib/auth";
import { GOOGLE_PENDING_COOKIE } from "@/lib/google";
import { BackBar, Note } from "@/components/ui";
import GoogleBuyerForm from "./google-form";

export const dynamic = "force-dynamic";

export default async function GoogleBuyerSignup() {
  const token = (await cookies()).get(GOOGLE_PENDING_COOKIE)?.value;
  if (!token) redirect("/login?google=failed");
  const [pending] = await db
    .select({ email: authTokens.email, name: authTokens.name })
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hash(token)), eq(authTokens.purpose, "google_signup"), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  if (!pending?.email || !pending.name) redirect("/login?google=failed");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Finish your account" href="/login" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-8 pt-3">
        <span className="w-fit rounded-full bg-soft px-3 py-1 text-xs font-extrabold text-deep">Step 2 of 2</span>
        <h1 className="text-[26px] font-extrabold tracking-tight">Check your phone</h1>
        <p className="text-sm leading-relaxed text-muted">
          You&apos;re signing up as <b className="text-ink">{pending.name}</b> with {pending.email}. Add a Nigerian phone number so sellers can reach you about orders.
        </p>
        <Note>We&apos;ll send a one-time code by SMS. Your number is only shared with sellers when you place an order.</Note>
        <GoogleBuyerForm />
      </div>
    </main>
  );
}
