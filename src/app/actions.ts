"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { endSession, hash, makeInviteCode, makeOtp, requireUser, startSession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { sendCode, smsTestMode } from "@/lib/sms";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const PENDING_COOKIE = "vl_pending_phone";
const TEST_CODE_COOKIE = "vl_test_code";

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

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
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
    const [inviter] = await db.select({ id: users.id }).from(users).where(eq(users.inviteCode, invite)).limit(1);
    if (!inviter) return fail("That invite code isn't valid. Please check it with the member who invited you.");
    invitedById = inviter.id;
  }

  const err = await issueCode(phone, { name, ward, invitedById, founder });
  if (err) return fail(err);
  redirect("/verify");
}

export async function startLogin(_: FormState, form: FormData): Promise<FormState> {
  const raw = String(form.get("phone") ?? "");
  const values = { phone: raw };
  const phone = normalizePhone(raw);
  if (!phone) return { error: "Please enter a valid Nigerian phone number, like 0803 123 4567.", values };

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) return { error: "We couldn't find an account with that number. Join with an invite code instead.", values };

  const err = await issueCode(phone);
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
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    userId = existing.id;
  } else if (otp.signup) {
    const s = otp.signup;
    const [created] = await db
      .insert(users)
      .values({
        name: s.name,
        phone,
        ward: s.ward,
        invitedById: s.invitedById,
        inviteCode: makeInviteCode(),
        role: s.founder ? "admin" : "member",
        confirmed: s.founder,
        confirmedAt: s.founder ? new Date() : null,
      })
      .returning({ id: users.id });
    userId = created.id;
  } else {
    return { error: "Something went wrong. Please start again." };
  }

  jar.delete(PENDING_COOKIE);
  jar.delete(TEST_CODE_COOKIE);
  await startSession(userId);
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
  if (me.role === "member") redirect("/home");
  const id = String(form.get("id") ?? "");
  await db
    .update(users)
    .set({ confirmed: true, confirmedById: me.id, confirmedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.confirmed, false)));
  redirect("/admin/members");
}
