import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { safeLink } from "@/lib/notifications";

// Opening a notice marks it read, then goes where it points.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.redirect(new URL("/notifications", req.url));
  const [n] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
    .returning({ link: notifications.link });
  const site = process.env.SITE_URL ?? req.nextUrl.origin;
  return NextResponse.redirect(new URL(safeLink(n?.link ?? null), site), 303);
}
