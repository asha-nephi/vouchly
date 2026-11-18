import { NextResponse, type NextRequest } from "next/server";
import { writeBasket } from "@/lib/basket";
import { confirmPayment } from "@/lib/payments";
import { allow, clientIp } from "@/lib/rate-limit";

// Paystack sends the buyer back here after paying.
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref") ?? "";
  const site = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";
  if (!allow(`done:${await clientIp()}`, 30, 60_000)) return NextResponse.redirect(new URL("/basket?payment=checking", site));
  const result = reference && reference.length <= 100 ? await confirmPayment(reference) : null;
  if (result && "retry" in result) return NextResponse.redirect(new URL("/basket?payment=checking", site));
  if (!result) return NextResponse.redirect(new URL("/basket?payment=failed", site));
  await writeBasket(null);
  return NextResponse.redirect(new URL(`/orders/${result.code}?placed=1`, site));
}
