"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, notifications, orders, otpCodes, reviews, users } from "@/db/schema";
import { endSession, hash, makeInviteCode, makeOtp, requireUser, startSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { sendCode, smsTestMode } from "@/lib/sms";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { GOOGLE_PENDING_COOKIE } from "@/lib/google";
import { emailReady } from "@/lib/email";

export type FormState = { error?: string; message?: string; values?: Record<string, string> } | undefined;

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const PENDING_COOKIE = "vl_pending_phone";
const TEST_CODE_COOKIE = "vl_test_code";
const emailAddress = (value: string) => value.trim().toLowerCase();

// Makes a new code, sends it, and remembers which phone is waiting.
async function issueCode(phone: string, signup: typeof otpCodes.$inferInsert["signup"] = null): Promise<string | null> {
  const [last] = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(eq(otpCodes.phone, phone))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < 60_000) {
    return "Please wait a minute before asking for another code.";
  }

  const code = makeOtp();
  await db.insert(otpCodes).values({
    phone,
    codeHash: hash(code),
    signup,
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
  });

  try {
    await sendCode(phone, code);
  } catch {
    return "We couldn't send the code. Please try again.";
  }

  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: CODE_MINUTES * 60 };
  jar.set(PENDING_COOKIE, phone, opts);
  if (smsTestMode()) jar.set(TEST_CODE_COOKIE, code, opts);
  return null;
}

export async function startSignup(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const ward = String(form.get("ward") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const invite = String(form.get("invite") ?? "").trim().toUpperCase();

  const values = { name, ward, phone: String(form.get("phone") ?? ""), invite };
  const fail = (error: string): FormState => ({ error, values });

  if (name.length < 2) return fail("Please enter your full name.");
  if (!phone) return fail("Please enter a valid Nigerian phone number, like 0803 123 4567.");
  if (ward.length < 2) return fail("Please enter your ward or branch.");
  if (!invite) return fail("Please enter the invite code a member gave you.");

  const [existing] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (existing) return fail("This phone number already has an account. Please log in instead.");

  // The very first account uses the founder code from Render settings.
  const founderCode = process.env.FOUNDER_INVITE_CODE?.toUpperCase();
  let founder = false;
  let invitedById: string | null = null;
  if (founderCode && invite === founderCode) {
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (admin) return fail("That invite code isn't valid. Please check it with the member who invited you.");
    founder = true;
  } else {
    const [inviter] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.inviteCode, invite), eq(users.isGuest, false), inArray(users.role, ["member", "ward_contact", "admin"]), eq(users.confirmed, true)))
      .limit(1);
    if (!inviter) return fail("That invite code isn't valid. Please check it with the member who invited you.");
    invitedById = inviter.id;
  }

  const err = await issueCode(phone, { name, ward, invitedById, founder });
  if (err) return fail(err);
  redirect("/verify");
}

export async function startBuyerSignup(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = emailAddress(String(form.get("email") ?? ""));
  const rawPhone = String(form.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);
  const password = String(form.get("password") ?? "");
  const values = { name, email, phone: rawPhone };
  const fail = (error: string): FormState => ({ error, values });

  if (!emailReady()) return fail("Email sign-up is not set up yet. Please use phone sign-in for now.");
  if (name.length < 2 || name.length > 80) return fail("Please enter your name.");
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
  if (!phone) return fail("Please enter a valid Nigerian phone number, like 0803 123 4567.");
  if (password.length < 12 || password.length > 128) return fail("Use a password with at least 12 characters.");

  const [byEmail] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), eq(users.isGuest, false))).limit(1);
  if (byEmail) return fail("That email already has an account. Log in or reset your password.");
  const [byPhone] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (byPhone) return fail("That phone number already has an account. Log in with your phone instead.");

  const passwordHash = await hashPassword(password);
  const err = await issueCode(phone, { kind: "buyer", name, email, passwordHash });
  if (err) return fail(err);
  redirect("/verify");
}

export async function startLogin(_: FormState, form: FormData): Promise<FormState> {
  const raw = String(form.get("phone") ?? "");
  const values = { phone: raw };
  const phone = normalizePhone(raw);
  if (!phone) return { error: "Please enter a valid Nigerian phone number, like 0803 123 4567.", values };

  const [user] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (!user) return { error: "We couldn't find an account with that number. Create a buyer account or join with an invite code.", values };

  const err = await issueCode(phone);
  if (err) return { error: err, values };
  redirect("/verify");
}

export async function startEmailLogin(_: FormState, form: FormData): Promise<FormState> {
  const email = emailAddress(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const values = { email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length > 128) {
    return { error: "The email or password isn't right.", values };
  }

  const now = new Date();
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordLockedUntil: users.passwordLockedUntil,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isGuest, false)))
    .limit(1);
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
  if (!user.emailVerifiedAt) return { error: "Verify your email first. You can still log in with your phone code.", values };
  await startSession(user.id);
  redirect("/home");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = emailAddress(String(form.get("email") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address.", values: { email } };

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isGuest, false)))
    .limit(1);
  if (user?.email && user.emailVerifiedAt) {
    try {
      await sendPasswordResetEmail(user);
    } catch (error) {
      console.error("Password reset email could not be sent.", error instanceof Error ? error.message : "Unknown error.");
    }
  }
  return { values: { email }, message: "If that email is linked to a Vouchly account, we'll send a reset link. If you don't get one, try signing in with your phone." };
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
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isGuest, false), ne(users.id, user.id)))
    .limit(1);
  if (taken) return { error: "That email is already used by another account.", values };

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

  const [byEmail] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, pending.email), eq(users.isGuest, false))).limit(1);
  if (byEmail) return { error: "That email already has an account. Log in, then connect Google in your account settings.", values };
  const [byPhone] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (byPhone) return { error: "That phone number already has an account. Log in with your phone first.", values };

  const err = await issueCode(phone, { kind: "google_buyer", name: pending.name, email: pending.email, googleSubject: pending.providerSubject, authTokenId: pending.id });
  if (err) return { error: err, values };
  redirect("/verify");
}

export async function verifyCode(_: FormState, form: FormData): Promise<FormState> {
  const jar = await cookies();
  const phone = jar.get(PENDING_COOKIE)?.value;
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!phone) return { error: "Your code has expired. Please start again." };
  if (code.length !== 6) return { error: "Please enter the 6-digit code." };

  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!otp) return { error: "Your code has expired. Please ask for a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { error: "Too many wrong tries. Please ask for a new code." };

  if (otp.codeHash !== hash(code)) {
    await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, otp.id));
    return { error: "That code isn't right. Please check and try again." };
  }
  await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, otp.id));

  let userId: string;
  let emailVerificationState: "pending" | "failed" | null = null;
  const [existing] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, false))).limit(1);
  if (existing) {
    userId = existing.id;
    await adoptGuestOrders(phone, userId);
  } else if (otp.signup) {
    const s = otp.signup;
    const isBuyer = "kind" in s && s.kind === "buyer";
    const isGoogleBuyer = "kind" in s && s.kind === "google_buyer";
    const [created] = await db
      .insert(users)
      .values(
        isBuyer
          ? {
              name: s.name,
              phone,
              email: s.email,
              passwordHash: s.passwordHash,
              ward: "Buyer",
              inviteCode: makeInviteCode(),
              role: "buyer",
            }
          : isGoogleBuyer
            ? {
                name: s.name,
                phone,
                email: s.email,
                emailVerifiedAt: new Date(),
                googleSubject: s.googleSubject,
                ward: "Buyer",
                inviteCode: makeInviteCode(),
                role: "buyer",
              }
            : {
                name: s.name,
                phone,
                ward: s.ward,
                invitedById: s.invitedById,
                inviteCode: makeInviteCode(),
                role: s.founder ? "admin" : "member",
                confirmed: s.founder,
                confirmedAt: s.founder ? new Date() : null,
              },
      )
      .returning({ id: users.id });
    userId = created.id;
    if (isBuyer) {
      try {
        await sendVerificationEmail({ id: userId, email: s.email, name: s.name });
        emailVerificationState = "pending";
      } catch {
        emailVerificationState = "failed";
      }
    }
    if (isGoogleBuyer) await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, s.authTokenId));
    await adoptGuestOrders(phone, userId);
  } else {
    return { error: "Something went wrong. Please start again." };
  }

  jar.delete(PENDING_COOKIE);
  jar.delete(TEST_CODE_COOKIE);
  jar.delete(GOOGLE_PENDING_COOKIE);
  await startSession(userId);
  if (emailVerificationState) redirect(`/me/security?email=${emailVerificationState}`);
  redirect("/home");
}

export async function resendCode(): Promise<void> {
  const jar = await cookies();
  const phone = jar.get(PENDING_COOKIE)?.value;
  if (!phone) redirect("/");
  // Carry the sign-up details over to the new code.
  const [prev] = await db
    .select({ signup: otpCodes.signup })
    .from(otpCodes)
    .where(eq(otpCodes.phone, phone))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  const err = await issueCode(phone, prev?.signup ?? null);
  redirect(err ? `/verify?e=${encodeURIComponent(err)}` : "/verify?sent=1");
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
  redirect("/home");
}

async function adoptGuestOrders(phone: string, userId: string) {
  const guests = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), eq(users.isGuest, true)));
  if (!guests.length) return;
  const ids = guests.map((g) => g.id);
  await db.update(orders).set({ buyerId: userId }).where(inArray(orders.buyerId, ids));
  await db.update(reviews).set({ authorId: userId }).where(inArray(reviews.authorId, ids));
  await db.update(notifications).set({ userId }).where(inArray(notifications.userId, ids));
}
