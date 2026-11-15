import { validWebhook } from "@/lib/paystack";
import { confirmPayment } from "@/lib/payments";

// Paystack also tells us about payments directly, in case the buyer closes the page.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhook(raw, req.headers.get("x-paystack-signature"))) return new Response("Bad signature", { status: 401 });
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad body", { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference) {
    const res = await confirmPayment(event.data.reference).catch((e) => {
      console.error("Webhook payment error:", (e as Error).message);
      return { retry: true } as const;
    });
    // Not "ok" yet, so Paystack sends it again later.
    if (res && "retry" in res) return new Response("Try again", { status: 503 });
  }
  return new Response("ok");
}
