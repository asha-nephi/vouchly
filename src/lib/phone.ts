// Turns 0803 123 4567 / +234 803... into 2348031234567. Returns null if it isn't a Nigerian mobile.
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("234")) n = n.slice(3);
  else if (n.startsWith("0")) n = n.slice(1);
  if (!/^[789][01]\d{8}$/.test(n)) return null;
  return "234" + n;
}

// 2348031234567 → 0803 *** 4567
export function maskPhone(phone: string): string {
  const local = "0" + phone.slice(3);
  return `${local.slice(0, 4)} *** ${local.slice(-4)}`;
}
