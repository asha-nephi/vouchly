// How each order status reads to the buyer.
export const STATUS: Record<string, { label: string; tone: "blue" | "amber" | "green" | "grey" | "red" }> = {
  awaiting_payment: { label: "Not paid", tone: "grey" },
  paid: { label: "Paid", tone: "blue" },
  confirmed: { label: "Confirmed", tone: "blue" },
  preparing: { label: "Being made", tone: "amber" },
  ready: { label: "Ready", tone: "green" },
  on_the_way: { label: "On the way", tone: "amber" },
  received: { label: "Received", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
  disputed: { label: "Problem reported", tone: "red" },
};

export const TONE: Record<string, string> = {
  blue: "bg-soft text-deep",
  amber: "bg-[#fdf0d5] text-[#7a4d06]",
  green: "bg-[#ddf3e4] text-[#1b6b3a]",
  grey: "bg-chip text-[#3a4458]",
  red: "bg-[#fbebeb] text-[#b42318]",
};

const FLOW = ["paid", "confirmed", "preparing", "ready", "received"] as const;

// Timeline steps for an order, marking which are done.
export function timeline(status: string, method: string) {
  const readyLabel = method === "pickup" ? "Ready for pickup" : method === "rider" ? "On the way with a rider" : "On the way";
  const steps = [
    { key: "paid", label: "Paid" },
    { key: "confirmed", label: "Seller confirmed" },
    { key: "preparing", label: "Being made" },
    { key: "ready", label: readyLabel },
    { key: "received", label: "You received it" },
  ];
  const at = status === "on_the_way" ? 3 : FLOW.indexOf(status as (typeof FLOW)[number]);
  return steps.map((s, i) => ({ ...s, state: at < 0 ? "next" : i < at ? "done" : i === at ? (i === 4 ? "done" : "now") : "next" }));
}

// How each status reads to the seller.
export const SELLER_STATUS: Record<string, { label: string; tone: "blue" | "amber" | "green" | "grey" | "red" }> = {
  paid: { label: "New", tone: "blue" },
  confirmed: { label: "Confirmed", tone: "blue" },
  preparing: { label: "Getting ready", tone: "amber" },
  ready: { label: "Ready for pickup", tone: "green" },
  on_the_way: { label: "On the way", tone: "amber" },
  received: { label: "Received", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
  disputed: { label: "Problem reported", tone: "red" },
};

export const OPEN = ["paid", "confirmed", "preparing", "ready", "on_the_way"] as const;
export const TO_DO = [...OPEN, "disputed"] as const;

// The seller's next step for an order, if any.
export function sellerNext(status: string, method: string): { to: string; label: string; rider?: boolean } | null {
  if (status === "paid") return { to: "confirmed", label: "Confirm order" };
  if (status === "confirmed") return { to: "preparing", label: "Start getting it ready" };
  if (status === "preparing") {
    if (method === "pickup") return { to: "ready", label: "It's ready for pickup" };
    if (method === "rider") return { to: "on_the_way", label: "Send with a rider", rider: true };
    return { to: "on_the_way", label: "I'm on my way" };
  }
  return null;
}

// What the buyer is told when the seller moves an order on.
export function buyerMessage(to: string, shop: string, method: string) {
  if (to === "confirmed") return `${shop} confirmed your order.`;
  if (to === "preparing") return `${shop} is getting your order ready.`;
  if (to === "ready") return `Your order is ready for pickup at ${shop}.`;
  if (to === "on_the_way") return method === "rider" ? `A rider is bringing your order from ${shop}.` : `${shop} is on the way with your order.`;
  return "";
}

export const PROBLEMS = [
  { value: "not_arrived", label: "It didn't arrive" },
  { value: "wrong_items", label: "Wrong or missing items" },
  { value: "quality", label: "Poor quality" },
  { value: "other", label: "Something else" },
] as const;

export const REVIEW_TAGS = ["Great quality", "On time", "Well packed", "Friendly", "Good value"] as const;
