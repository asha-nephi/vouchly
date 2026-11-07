import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// Tiny check the bell makes now and then.
export async function GET() {
  const user = await currentUser();
  const n = user ? await unreadCount(user.id) : 0;
  return NextResponse.json({ n }, { headers: { "Cache-Control": "no-store" } });
}
