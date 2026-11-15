import { NextResponse, type NextRequest } from "next/server";
import { settleDue } from "@/lib/after-order";
import { recheckPending } from "@/lib/payments";

export const dynamic = "force-dynamic";

// For an outside timer (e.g. cron-job.org). Needs ?key=CRON_SECRET.
export async function GET(req: NextRequest) {
  const key = process.env.CRON_SECRET;
  if (!key || req.nextUrl.searchParams.get("key") !== key) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const [settled, payments] = await Promise.all([settleDue(), recheckPending()]);
    return NextResponse.json({ ok: true, ...settled, payments });
  } catch (e) {
    console.error("Cron settle failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Settle failed. See the logs." }, { status: 500 });
  }
}
