import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Thin wrapper around the Paystack API. Amounts are in kobo.

const BASE = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";

export const paystackReady = () => !!process.env.PAYSTACK_SECRET_KEY;

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status) throw new Error(json.message || `Paystack error ${res.status}`);
  return json.data as T;
}

export function initializePayment(p: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  subaccount?: string | null;
  ourShareKobo?: number;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; reference: string }>("POST", "/transaction/initialize", {
    email: p.email,
    amount: p.amountKobo,
    reference: p.reference,
    callback_url: p.callbackUrl,
    currency: "NGN",
    metadata: p.metadata,
    // Split: the seller's subaccount gets the rest, we keep our 5% and pay Paystack's fee.
    ...(p.subaccount ? { subaccount: p.subaccount, transaction_charge: p.ourShareKobo, bearer: "account" } : {}),
  });
}

export function verifyPayment(reference: string) {
  return call<{ status: string; amount: number; reference: string }>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

export function listBanks() {
  return call<{ name: string; code: string }[]>("GET", "/bank?country=nigeria&perPage=100");
}

export function resolveAccount(accountNumber: string, bankCode: string) {
  return call<{ account_name: string; account_number: string }>(
    "GET",
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
  );
}

export function createSubaccount(p: { businessName: string; bankCode: string; accountNumber: string; phone: string }) {
  return call<{ subaccount_code: string }>("POST", "/subaccount", {
    business_name: p.businessName,
    settlement_bank: p.bankCode,
    account_number: p.accountNumber,
    percentage_charge: 0, // we set our share per payment instead
    primary_contact_phone: p.phone,
  });
}

export function refundPayment(reference: string, amountKobo?: number) {
  return call<unknown>("POST", "/refund", { transaction: reference, ...(amountKobo ? { amount: amountKobo } : {}) });
}

// Checks that a webhook really came from Paystack.
export function validWebhook(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
