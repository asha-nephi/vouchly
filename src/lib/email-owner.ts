import "server-only";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// An email only belongs to someone once they have proved they own it.
export async function verifiedEmailOwner(email: string): Promise<{ id: string } | undefined> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isGuest, false), isNotNull(users.emailVerifiedAt)))
    .limit(1);
  return row;
}

// Marks the email as proved for this user and takes it off anyone else who typed it without proving it.
export async function claimEmail(userId: string, email: string, extra: Partial<typeof users.$inferInsert> = {}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ email: null, emailVerifiedAt: null })
      .where(and(eq(users.email, email), eq(users.isGuest, false), isNull(users.emailVerifiedAt), ne(users.id, userId)));
    await tx.update(users).set({ ...extra, email, emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  });
}
