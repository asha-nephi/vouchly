// Sends sign-in codes. In test mode nothing is sent and the code is shown on screen instead.

export function smsTestMode(): boolean {
  return process.env.SMS_TEST_MODE === "true" || !process.env.TERMII_API_KEY;
}

export async function sendCode(phone: string, code: string): Promise<void> {
  if (smsTestMode()) return;

  const base = process.env.TERMII_BASE_URL ?? "https://v3.api.termii.com";
  const res = await fetch(`${base}/api/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TERMII_API_KEY,
      to: phone,
      from: process.env.TERMII_SENDER ?? "N-Alert",
      sms: `Your Vouchly code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
      type: "plain",
      channel: "dnd",
    }),
  });
  if (!res.ok) throw new Error(`Termii send failed: ${res.status}`);
}
