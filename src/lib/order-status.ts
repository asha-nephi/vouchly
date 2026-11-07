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
