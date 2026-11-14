import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser, startSession } from "@/lib/auth";
import { createAuthToken } from "@/lib/email-auth";
import { googleClient } from "@/lib/google";

const STATE_COOKIE = "vl_google_state";
const PENDING_COOKIE = "vl_google_signup";

const appUrl = (request: Request, path: string) => new URL(path, process.env.SITE_URL ?? new URL(request.url).origin);
const backToLogin = (request: Request, reason: string) => NextResponse.redirect(appUrl(request, `/login?google=${reason}`));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) return backToLogin(request, "cancelled");

  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const jar = await cookies();
  const saved = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  const [savedState, savedNonce, intent] = saved?.split(".") ?? [];
  if (!state || !code || !savedNonce || savedState !== state || (intent !== "link" && intent !== "login")) return backToLogin(request, "failed");
  const linking = intent === "link";

  let payload;
  try {
    const client = googleClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return backToLogin(request, "failed");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return backToLogin(request, "failed");
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== savedNonce) return backToLogin(request, "failed");

  const email = payload.email.trim().toLowerCase();
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return backToLogin(request, "failed");
  if (linking) {
    const me = await currentUser();
    if (!me || me.isGuest) return backToLogin(request, "failed");
    if (me.email && me.email.toLowerCase() !== email) return NextResponse.redirect(appUrl(request, "/me/security?google=email-mismatch"));
    const [emailOwner] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), eq(users.isGuest, false))).limit(1);
    if (emailOwner && emailOwner.id !== me.id) return NextResponse.redirect(appUrl(request, "/me/security?google=email-used"));
    const [subjectOwner] = await db.select({ id: users.id }).from(users).where(eq(users.googleSubject, payload.sub)).limit(1);
    if (subjectOwner && subjectOwner.id !== me.id) return NextResponse.redirect(appUrl(request, "/me/security?google=used"));
    await db.update(users).set({ email, emailVerifiedAt: new Date(), googleSubject: payload.sub }).where(eq(users.id, me.id));
    return NextResponse.redirect(appUrl(request, "/me/security?google=connected"));
  }

  const [byGoogle] = await db.select({ id: users.id }).from(users).where(eq(users.googleSubject, payload.sub)).limit(1);
  if (byGoogle) {
    await startSession(byGoogle.id);
    return NextResponse.redirect(appUrl(request, "/home"));
  }
  const [byEmail] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), eq(users.isGuest, false))).limit(1);
  if (byEmail) return backToLogin(request, "link");

  const { token } = await createAuthToken({
    purpose: "google_signup",
    email,
    name: payload.name?.trim().slice(0, 80) || email.split("@")[0],
    providerSubject: payload.sub,
    minutes: 15,
  });
  jar.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 900,
  });
  return NextResponse.redirect(appUrl(request, "/register/google"));
}
