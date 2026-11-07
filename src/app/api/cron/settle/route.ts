import { NextResponse, type NextRequest } from "next/server";
import { settleDue } from "@/lib/after-order";

export const dynamic = "force-dynamic";

// For an outside timer (e.g. cron-job.org). Needs ?key=CRON_SECRET.
export async function GET(req: NextRequest) {
  const key = process.env.CRON_SECRET;
  if (!key || req.nextUrl.searchParams.get("key") !== key) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await settleDue()) });
}
