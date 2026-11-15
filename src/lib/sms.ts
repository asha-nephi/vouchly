// Sends sign-in codes by SMS through Twilio (Termii is the old fallback).
// In test mode nothing is sent and the code is shown on screen instead.

function twilioReady(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_AUTH_TOKEN);
}

export function smsTestMode(): boolean {
  return process.env.SMS_TEST_MODE === "true" || (!twilioReady() && !process.env.TERMII_API_KEY);
}

// 2348031234567 → +2348031234567
export function toE164(phone: string): string {
  return "+" + phone.replace(/\D/g, "");
}

export async function sendSms(phone: string, text: string): Promise<void> {
  if (smsTestMode()) return;
  if (twilioReady()) return sendTwilio(phone, text);
  return sendTermii(phone, text);
}

export async function sendCode(phone: string, code: string): Promise<void> {
  await sendSms(phone, `Your Vouchly code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`);
}

async function sendTwilio(phone: string, text: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_ACCOUNT_AUTH_TOKEN!;
  const base = process.env.TWILIO_BASE_URL ?? "https://api.twilio.com";
  const body = new URLSearchParams({ To: toE164(phone), Body: text });
  // A Messaging Service picks the sender; otherwise use TWILIO_FROM (a number or a name like "Vouchly").
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) body.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else body.set("From", process.env.TWILIO_FROM || "Vouchly");

  let res: Response;
  try {
    res = await fetch(`${base}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error("Twilio SMS: could not reach Twilio", (e as Error).message);
    throw new Error("sms_failed");
  }
  if (!res.ok) {
    // Twilio errors look like { code, message, more_info, status }; log without the phone number.
    const err = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
    console.error(`Twilio SMS failed: ${res.status} code=${err?.code ?? "?"} ${err?.message ?? ""}`);
    throw new Error("sms_failed");
  }
}

async function sendTermii(phone: string, text: string): Promise<void> {
  const base = process.env.TERMII_BASE_URL ?? "https://v3.api.termii.com";
  const res = await fetch(`${base}/api/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TERMII_API_KEY,
      to: phone,
      from: process.env.TERMII_SENDER ?? "N-Alert",
      sms: text,
      type: "plain",
      channel: "dnd",
    }),
  });
  if (!res.ok) {
    console.error(`Termii SMS failed: ${res.status}`);
    throw new Error("sms_failed");
  }
}
