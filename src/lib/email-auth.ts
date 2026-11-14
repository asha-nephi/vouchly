import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens, users } from "@/db/schema";
import { emailUrl, escapeHtml, sendEmail } from "./email";
import { hash } from "./auth";

type TokenPurpose = typeof authTokens.$inferInsert["purpose"];

export async function createAuthToken(input: {
  purpose: TokenPurpose;
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  providerSubject?: string | null;
  minutes?: number;
}): Promise<{ id: string; token: string }> {
  if (input.userId) {
    const [latest] = await db
      .select({ createdAt: authTokens.createdAt })
      .from(authTokens)
      .where(and(eq(authTokens.userId, input.userId), eq(authTokens.purpose, input.purpose)))
      .orderBy(desc(authTokens.createdAt))
      .limit(1);
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) throw new Error("Please wait a minute before asking for another email.");
    await db.delete(authTokens).where(and(eq(authTokens.userId, input.userId), eq(authTokens.purpose, input.purpose), isNull(authTokens.usedAt)));
  }
  const token = randomBytes(32).toString("base64url");
  const [row] = await db
    .insert(authTokens)
    .values({
      userId: input.userId ?? null,
      email: input.email ?? null,
      name: input.name ?? null,
      providerSubject: input.providerSubject ?? null,
      tokenHash: hash(token),
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + (input.minutes ?? 30) * 60_000),
    })
    .returning({ id: authTokens.id });
  return { id: row.id, token };
}

export async function sendVerificationEmail(user: Pick<typeof users.$inferSelect, "id" | "email" | "name">): Promise<void> {
  if (!user.email) throw new Error("Add an email address first.");
  const { token } = await createAuthToken({ purpose: "email_verification", userId: user.id, email: user.email });
  const link = emailUrl(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  const name = escapeHtml(user.name);
  await sendEmail(
    user.email,
    "Verify your Vouchly email",
    `Hi ${user.name}, open this link to verify your email: ${link}\n\nIf you did not ask for this, you can ignore this message.`,
    `<p>Hi ${name},</p><p><a href="${link}">Verify your email address</a> to use email and password on Vouchly.</p><p>If you did not ask for this, you can ignore this message.</p>`,
  );
}

export async function sendPasswordResetEmail(user: Pick<typeof users.$inferSelect, "id" | "email" | "name">): Promise<void> {
  if (!user.email) throw new Error("We couldn't find an account with that email.");
  const { token } = await createAuthToken({ purpose: "password_reset", userId: user.id, email: user.email });
  const link = emailUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  const name = escapeHtml(user.name);
  await sendEmail(
    user.email,
    "Reset your Vouchly password",
    `Hi ${user.name}, open this link to choose a new password: ${link}\n\nIf you did not ask for this, you can ignore this message.`,
    `<p>Hi ${name},</p><p><a href="${link}">Choose a new password</a> for your Vouchly account.</p><p>If you did not ask for this, you can ignore this message.</p>`,
  );
}
