import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { currentUser, hash } from "@/lib/auth";
import { claimEmail, verifiedEmailOwner } from "@/lib/email-owner";

const appUrl = (request: Request, path: string) => new URL(path, process.env.SITE_URL ?? new URL(request.url).origin);

// Email apps often open links before the person does, so this must not log anyone in
// and must still say "verified" if the same link is opened again.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const expired = NextResponse.redirect(appUrl(request, "/login?email=expired"));
  if (!/^[A-Za-z0-9_-]{30,50}$/.test(token)) return expired;

  const [row] = await db
    .select({
      tokenId: authTokens.id,
      tokenEmail: authTokens.email,
      usedAt: authTokens.usedAt,
      expiresAt: authTokens.expiresAt,
      userId: users.id,
      userEmail: users.email,
      verifiedAt: users.emailVerifiedAt,
    })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .where(and(eq(authTokens.tokenHash, hash(token)), eq(authTokens.purpose, "email_verification")))
    .limit(1);
  if (!row?.tokenEmail || row.tokenEmail !== row.userEmail) return expired;

  if (!row.usedAt) {
    if (row.expiresAt <= new Date()) return expired;
    // Someone else already proved this email, so this account can't have it.
    const owner = await verifiedEmailOwner(row.tokenEmail);
    if (owner && owner.id !== row.userId) {
      const me = await currentUser();
      return NextResponse.redirect(appUrl(request, me?.id === row.userId ? "/me/security?email=taken" : "/login?email=taken"));
    }
    await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.id, row.tokenId), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())));
    if (!row.verifiedAt) await claimEmail(row.userId, row.tokenEmail);
  } else if (!row.verifiedAt) {
    return expired;
  }

  const me = await currentUser();
  return NextResponse.redirect(appUrl(request, me?.id === row.userId ? "/me/security?email=done" : "/login?email=verified"));
}
