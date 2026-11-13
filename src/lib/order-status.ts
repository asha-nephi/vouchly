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
  requested: { label: "Waiting for a quote", tone: "amber" },
  quoted: { label: "Quote ready", tone: "blue" },
};

// Labels that change for stays and services.
export function statusLabel(status: string, method: string, seller = false) {
  if (method === "check_in") {
    const m: Record<string, string> = { paid: seller ? "New booking" : "Booked", confirmed: "Accepted", ready: "Check-in details sent", received: "Checked in" };
    if (m[status]) return m[status];
  }
  if (method === "download" && status === "received") return seller ? "Sold" : "Ready to download";
  if (method === "visit") {
    const m: Record<string, string> = {
      paid: seller ? "New job" : "Booked",
      confirmed: "Accepted",
      on_the_way: "On the way",
      ready: "Job done",
      received: "Finished",
      requested: seller ? "Quote needed" : "Waiting for a quote",
      quoted: seller ? "Quote sent" : "Quote ready",
    };
    if (m[status]) return m[status];
  }
  return (seller ? SELLER_STATUS : STATUS)[status]?.label ?? status;
}

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
  let steps: { key: string; label: string }[];
  let order: string[];
  if (method === "check_in") {
    steps = [
      { key: "paid", label: "Paid" },
      { key: "confirmed", label: "Host accepted" },
      { key: "ready", label: "Check-in details sent" },
      { key: "received", label: "You checked in" },
    ];
    order = ["paid", "confirmed", "ready", "received"];
  } else if (method === "visit") {
    steps = [
      { key: "paid", label: "Paid" },
      { key: "confirmed", label: "Accepted" },
      { key: "on_the_way", label: "On the way" },
      { key: "ready", label: "Job done" },
      { key: "received", label: "You confirmed it" },
    ];
    order = ["paid", "confirmed", "on_the_way", "ready", "received"];
  } else {
    const readyLabel = method === "pickup" ? "Ready for pickup" : method === "rider" ? "On the way with a rider" : "On the way";
    steps = [
      { key: "paid", label: "Paid" },
      { key: "confirmed", label: "Seller confirmed" },
      { key: "preparing", label: "Being made" },
      { key: "ready", label: readyLabel },
      { key: "received", label: "You received it" },
    ];
    order = ["paid", "confirmed", "preparing", "ready", "received"];
  }
  const at = method !== "visit" && status === "on_the_way" ? 3 : order.indexOf(status);
  const last = steps.length - 1;
  return steps.map((st, i) => ({ ...st, state: at < 0 ? "next" : i < at ? "done" : i === at ? (i === last ? "done" : "now") : "next" }));
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
  requested: { label: "Quote needed", tone: "amber" },
  quoted: { label: "Quote sent", tone: "blue" },
};

export const OPEN = ["paid", "confirmed", "preparing", "ready", "on_the_way"] as const;
export const TO_DO = [...OPEN, "disputed", "requested", "quoted"] as const;

// The seller's next step for an order, if any.
// form: "rider" needs rider details, "checkin" needs check-in details.
export function sellerNext(status: string, method: string): { to: string; label: string; form?: "rider" | "checkin" } | null {
  if (method === "check_in") {
    if (status === "paid") return { to: "confirmed", label: "Accept booking" };
    if (status === "confirmed") return { to: "ready", label: "Send check-in details", form: "checkin" };
    return null;
  }
  if (method === "visit") {
    if (status === "paid") return { to: "confirmed", label: "Accept job" };
    if (status === "confirmed") return { to: "on_the_way", label: "I'm on my way" };
    if (status === "on_the_way") return { to: "ready", label: "Job done" };
    return null;
  }
  if (status === "paid") return { to: "confirmed", label: "Confirm order" };
  if (status === "confirmed") return { to: "preparing", label: "Start getting it ready" };
  if (status === "preparing") {
    if (method === "pickup") return { to: "ready", label: "It's ready for pickup" };
    if (method === "rider") return { to: "on_the_way", label: "Send with a rider", form: "rider" };
    return { to: "on_the_way", label: "I'm on my way" };
  }
  return null;
}

// What the buyer is told when the seller moves an order on.
export function buyerMessage(to: string, shop: string, method: string) {
  if (method === "check_in") {
    if (to === "confirmed") return `${shop} accepted your booking.`;
    if (to === "ready") return `${shop} sent your check-in details.`;
  }
  if (method === "visit") {
    if (to === "confirmed") return `${shop} accepted your job.`;
    if (to === "on_the_way") return `${shop} is on the way to you.`;
    if (to === "ready") return `${shop} says the job is done. Please confirm.`;
  }
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
