"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { endSession, hash, makeInviteCode, requireUser, startSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { GOOGLE_PENDING_COOKIE } from "@/lib/google";
import { emailReady } from "@/lib/email";
import { claimEmail, verifiedEmailOwner } from "@/lib/email-owner";
import { cleanTrades, isSellerType, PATH_COOKIE } from "@/lib/seller-types";

export type FormState = { error?: string; message?: string; values?: Record<string, string> } | undefined;

// Keeps the invite code while someone makes an account to join as a member.
const INVITE_COOKIE = "vl_invite";
const emailAddress = (value: string) => value.trim().toLowerCase();

// Where to go after a new account: back to the member form if they were joining, else home.
async function afterSignup(fallback: string): Promise<string> {
  const jar = await cookies();
  if (!jar.get(PATH_COOKIE)?.value) return fallback;
  const code = jar.get(INVITE_COOKIE)?.value;
  return `/join?step=details${code ? `&code=${code}` : ""}`;
}

export async function startBuyerSignup(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = emailAddress(String(form.get("email") ?? ""));
  const rawPhone = String(form.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);
  const password = String(form.get("password") ?? "");
  const values = { name, email, phone: rawPhone };
  const fail = (error: string): FormState => ({ error, values });

  if (!emailReady()) return fail("Email sign-up is not set up yet. Please use Google for now.");
  if (name.length < 2 || name.length > 80) return fail("Please enter your name.");
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
  if (!phone) return fail("Please enter a valid Nigerian phone number, like 0803 123 4567.");
  if (password.length < 12 || password.length > 128) return fail("Use a password with at least 12 characters.");

  if (await verifiedEmailOwner(email)) return fail("That email already has an account. Log in or reset your password.");
  const [byPhone] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (byPhone) return fail("That phone number already has an account. Please log in instead.");

  // The phone isn't checked by SMS for now; it is saved for sellers to reach the buyer.
  const [created] = await db
    .insert(users)
    .values({ name, phone, email, passwordHash: await hashPassword(password), ward: "Buyer", inviteCode: makeInviteCode(), role: "buyer" })
    .returning({ id: users.id });
  let sent = true;
  try {
    await sendVerificationEmail({ id: created.id, email, name });
  } catch {
    sent = false;
  }
  await startSession(created.id);
  redirect(await afterSignup(`/me/security?email=${sent ? "pending" : "failed"}`));
}

export async function startEmailLogin(_: FormState, form: FormData): Promise<FormState> {
  const email = emailAddress(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const values = { email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length > 128) {
    return { error: "The email or password isn't right.", values };
  }

  const now = new Date();
  // Unproved emails can be typed by more than one account, so look at the proved one first.
  const found = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordLockedUntil: users.passwordLockedUntil,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isGuest, false)))
    .orderBy(sql`${users.emailVerifiedAt} DESC NULLS LAST`)
    .limit(3);
  const user = found[0];
  if (user && !user.emailVerifiedAt) {
    for (const u of found) {
      if (u.passwordHash && (await verifyPassword(password, u.passwordHash))) {
        return { error: "Verify your email first. Open the link we sent you, or log in with Google.", values };
      }
    }
    return { error: "The email or password isn't right.", values };
  }
  if (!user?.passwordHash || (user.passwordLockedUntil && user.passwordLockedUntil > now)) {
    return { error: "The email or password isn't right.", values };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const windowStart = new Date(now.getTime() - 15 * 60_000);
    const lockedUntil = new Date(now.getTime() + 15 * 60_000);
    // Dates go in as text, so cast them or Postgres refuses the update.
    const since = sql`${windowStart.toISOString()}::timestamptz`;
    const until = sql`${lockedUntil.toISOString()}::timestamptz`;
    const failedRecently = sql`${users.passwordFailedAt} IS NOT NULL AND ${users.passwordFailedAt} > ${since}`;
    await db
      .update(users)
      .set({
        passwordFailedCount: sql`CASE WHEN ${failedRecently} THEN ${users.passwordFailedCount} + 1 ELSE 1 END`,
        passwordFailedAt: now,
        passwordLockedUntil: sql`CASE WHEN ${failedRecently} AND ${users.passwordFailedCount} + 1 >= 5 THEN ${until} ELSE NULL END`,
      })
      .where(eq(users.id, user.id));
    return { error: "The email or password isn't right.", values };
  }
  await db
    .update(users)
    .set({ passwordFailedCount: 0, passwordFailedAt: null, passwordLockedUntil: null })
    .where(eq(users.id, user.id));
  await startSession(user.id);
  redirect("/home");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = emailAddress(String(form.get("email") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address.", values: { email } };

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isGuest, false), isNotNull(users.emailVerifiedAt)))
    .limit(1);
  if (user?.email && user.emailVerifiedAt) {
    try {
      await sendPasswordResetEmail(user);
    } catch (error) {
      console.error("Password reset email could not be sent.", error instanceof Error ? error.message : "Unknown error.");
    }
  }
  return { values: { email }, message: "If that email is linked to a Vouchly account, we'll send a reset link. If you don't get one, try logging in with Google." };
}

export async function setNewPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!/^[A-Za-z0-9_-]{30,50}$/.test(token)) return { error: "This link has expired. Ask for a new one." };
  if (password.length < 12 || password.length > 128) return { error: "Use a password with at least 12 characters." };
  const [authToken] = await db
    .select({ id: authTokens.id, userId: authTokens.userId })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .where(and(eq(authTokens.tokenHash, hash(token)), eq(authTokens.purpose, "password_reset"), eq(authTokens.email, users.email), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  if (!authToken?.userId) return { error: "This link has expired. Ask for a new one." };

  const passwordHash = await hashPassword(password);
  const [used] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, authToken.id), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning({ id: authTokens.id });
  if (!used) return { error: "This link has expired. Ask for a new one." };
  await db
    .update(users)
    .set({ passwordHash, passwordFailedCount: 0, passwordFailedAt: null, passwordLockedUntil: null })
    .where(eq(users.id, authToken.userId));
  await startSession(authToken.userId);
  redirect("/home");
}

export async function updateLoginSettings(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const email = emailAddress(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const values = { email };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { error: "Please enter a valid email address.", values };
  if (password.length < 12 || password.length > 128) return { error: "Use a password with at least 12 characters.", values };
  const changedEmail = email !== user.email;
  if ((changedEmail || !user.emailVerifiedAt) && !emailReady()) return { error: "Email sign-in is not set up yet. Please try again later.", values };
  const taken = await verifiedEmailOwner(email);
  if (taken && taken.id !== user.id) return { error: "That email is already used by another account.", values };

  await db
    .update(users)
    .set({
      email,
      passwordHash: await hashPassword(password),
      passwordFailedCount: 0,
      passwordFailedAt: null,
      passwordLockedUntil: null,
      ...(changedEmail ? { emailVerifiedAt: null } : {}),
    })
    .where(eq(users.id, user.id));
  if (changedEmail) {
    await db.delete(authTokens).where(and(eq(authTokens.userId, user.id), eq(authTokens.purpose, "password_reset"), isNull(authTokens.usedAt)));
  }
  if (changedEmail || !user.emailVerifiedAt) {
    try {
      await sendVerificationEmail({ id: user.id, email, name: user.name });
    } catch (error) {
      return { values: { email }, error: error instanceof Error ? error.message : "The verification email could not be sent." };
    }
    return { values: { email }, message: "Check your email for a verification link." };
  }
  return { values: { email }, message: "Your sign-in details are saved." };
}

export async function resendVerificationEmail(): Promise<void> {
  const user = await requireUser();
  if (!user.email) redirect("/me/security?email=missing");
  if (user.emailVerifiedAt) redirect("/me/security?email=verified");
  let sent = true;
  try {
    await sendVerificationEmail({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    sent = false;
    // Asked again within a minute, or the email service failed.
    console.error("Verification email could not be sent.", error instanceof Error ? error.message : "Unknown error.");
  }
  redirect(sent ? "/me/security?email=sent" : "/me/security?email=wait");
}

export async function startGoogleBuyerSignup(_: FormState, form: FormData): Promise<FormState> {
  const jar = await cookies();
  const token = jar.get(GOOGLE_PENDING_COOKIE)?.value;
  const phoneRaw = String(form.get("phone") ?? "");
  const phone = normalizePhone(phoneRaw);
  const values = { phone: phoneRaw };
  if (!token || !phone) return { error: "Please enter a valid Nigerian phone number, like 0803 123 4567.", values };

  const [pending] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hash(token)), eq(authTokens.purpose, "google_signup"), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  if (!pending?.email || !pending.name || !pending.providerSubject) return { error: "Your Google sign-in expired. Please start again.", values };

  if (await verifiedEmailOwner(pending.email)) return { error: "That email already has an account. Log in, then connect Google in your account settings.", values };
  const [byPhone] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (byPhone) return { error: "That phone number already has an account. Please log in instead.", values };

  // Use the Google sign-up once, so a second tap can't make two accounts.
  const [used] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, pending.id), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  if (!used) return { error: "Your Google sign-in expired. Please start again.", values };
  const [created] = await db
    .insert(users)
    .values({ name: pending.name, phone, googleSubject: pending.providerSubject, ward: "Buyer", inviteCode: makeInviteCode(), role: "buyer" })
    .returning({ id: users.id });
  // Google already proved the email, so take it off anyone who only typed it.
  await claimEmail(created.id, pending.email);
  jar.delete(GOOGLE_PENDING_COOKIE);
  await startSession(created.id);
  redirect(await afterSignup("/home"));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

// Ward contacts and admins confirm new members.
export async function confirmMember(form: FormData): Promise<void> {
  const me = await requireUser();
  if (me.role !== "ward_contact" && me.role !== "admin") redirect("/home");
  const id = String(form.get("id") ?? "");
  await db
    .update(users)
    .set({ confirmed: true, confirmedById: me.id, confirmedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.role, "member"), eq(users.confirmed, false)));
  redirect("/admin/members");
}

export async function upgradeBuyerToMember(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "buyer") redirect("/home");
  const ward = String(form.get("ward") ?? "").trim();
  const invite = String(form.get("invite") ?? "").trim().toUpperCase();
  const values = { ward, invite };
  if (ward.length < 2) return { error: "Please enter your ward or branch.", values };
  if (!invite) return { error: "Please enter the invite code a member gave you.", values };
  const [inviter] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.inviteCode, invite), inArray(users.role, ["member", "ward_contact", "admin"]), eq(users.confirmed, true)))
    .limit(1);
  if (!inviter) return { error: "That invite code isn't valid. Please check it with the member who invited you.", values };
  await db
    .update(users)
    .set({ role: "member", ward, invitedById: inviter.id, confirmed: false, confirmedById: null, confirmedAt: null })
    .where(eq(users.id, user.id));
  (await cookies()).delete(INVITE_COOKIE);
  redirect("/home");
}

// Sign-up step 1: buying goes to the buyer form; selling keeps the path for the shop setup.
export async function chooseJoinPath(form: FormData): Promise<void> {
  const path = String(form.get("path") ?? "");
  const raw = String(form.get("code") ?? "");
  const code = /^[A-Za-z0-9]{4,12}$/.test(raw) ? raw.toUpperCase() : "";
  const jar = await cookies();
  if (path === "buy") {
    // Forget an earlier selling choice so sign-up doesn't send them to the member step.
    jar.delete(PATH_COOKIE);
    jar.delete(INVITE_COOKIE);
  }
  if (!isSellerType(path)) redirect(path === "buy" ? "/register" : code ? `/join?code=${code}` : "/join");
  const trades = cleanTrades(path, form.getAll("trade").map(String));
  jar.set(PATH_COOKIE, JSON.stringify({ type: path, trades }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  if (code) jar.set(INVITE_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
  redirect(`/join?step=details${code ? `&code=${code}` : ""}`);
}
