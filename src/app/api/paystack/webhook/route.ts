import { validWebhook } from "@/lib/paystack";
import { confirmPayment } from "@/lib/payments";

// Paystack also tells us about payments directly, in case the buyer closes the page.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhook(raw, req.headers.get("x-paystack-signature"))) return new Response("Bad signature", { status: 401 });
  const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
  if (event.event === "charge.success" && event.data?.reference) await confirmPayment(event.data.reference);
  return new Response("ok");
}
