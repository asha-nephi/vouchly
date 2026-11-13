import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { currentUser, startSession } from "@/lib/auth";

// A guest's private order link. Opens their order on any phone.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const site = process.env.SITE_URL ?? req.nextUrl.origin;
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return NextResponse.redirect(new URL("/", site));
  const [row] = await db
    .select({ code: orders.code, buyerId: orders.buyerId, isGuest: users.isGuest })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerId))
    .where(eq(orders.accessToken, token))
    .limit(1);
  if (!row) return NextResponse.redirect(new URL("/", site));
  const me = await currentUser();
  // Members sign in the normal way. Guests are signed in to their own guest record.
  if (row.isGuest && me?.id !== row.buyerId && !(me && !me.isGuest)) await startSession(row.buyerId);
  return NextResponse.redirect(new URL(`/orders/${row.code}`, site));
}
