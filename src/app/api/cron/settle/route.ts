import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { settleDue } from "@/lib/after-order";
import { recheckPending } from "@/lib/payments";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// For an outside timer (e.g. cron-job.org). Send CRON_SECRET in an "Authorization: Bearer ..." header.
// The old ?key=... way still works, but it shows up in logs, so the header is better.
export async function GET(req: NextRequest) {
  const key = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("key") ?? "";
  if (!key || !same(given, key)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const [settled, payments] = await Promise.all([settleDue(), recheckPending()]);
    return NextResponse.json({ ok: true, ...settled, payments });
  } catch (e) {
    console.error("Cron settle failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Settle failed. See the logs." }, { status: 500 });
  }
}
