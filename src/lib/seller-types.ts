// The three selling paths, the chips for each, and the words their dashboard uses.
export const SELLER_TYPES = {
  service: {
    title: "I offer a service",
    body: "Plumber, electrician, cleaner, chef, tailor, tutor. Get booked and paid.",
    ask: "What do you do?",
    trades: ["Plumbing", "Electrical", "AC repair", "Cleaning", "Chef and catering", "Tailoring", "Hair and beauty", "Tutoring", "Other"],
    bg: "#4F6D7A",
  },
  online: {
    title: "I sell online",
    body: "Downloads, 1-on-1 coaching, classes and events.",
    ask: "What will you offer?",
    trades: ["Downloads", "1-on-1 coaching", "Classes", "Events", "Other"],
    bg: "#3F5BA9",
  },
  products: {
    title: "I sell products",
    body: "Food, drinks, fashion, crafts, or a physical store.",
    ask: "What do you sell?",
    trades: ["Food", "Drinks", "Fashion", "Crafts", "Home goods", "Stays", "Other"],
    bg: "#B5712F",
  },
} as const;
export type SellerType = keyof typeof SELLER_TYPES;

// The listing kinds each path sees first; the rest sit under "More types".
export const FIRST_KINDS = {
  service: ["service", "session"],
  online: ["digital", "session", "event"],
  products: ["item", "stay"],
} as const satisfies Record<SellerType, readonly string[]>;
export const SELLER_TYPE_IDS = Object.keys(SELLER_TYPES) as SellerType[];
export const isSellerType = (v: unknown): v is SellerType => typeof v === "string" && v in SELLER_TYPES;

// Only chips from the picked path are kept.
export const cleanTrades = (type: SellerType, picked: string[]) => (SELLER_TYPES[type].trades as readonly string[]).filter((t) => picked.includes(t));

// The path picked at sign-up waits in this cookie until the shop is made.
export const PATH_COOKIE = "vl_seller_path";
export function readPath(raw?: string): { type: SellerType; trades: string[] } | null {
  try {
    const v = JSON.parse(raw ?? "");
    return isSellerType(v?.type) ? { type: v.type, trades: Array.isArray(v.trades) ? cleanTrades(v.type, v.trades.map(String)) : [] } : null;
  } catch {
    return null;
  }
}

// The shop category from the first chip that maps to one, so we don't ask twice.
const CHIP_CATEGORY: Record<string, string> = {
  Food: "food", Drinks: "food", Fashion: "fashion", Crafts: "fashion", "Home goods": "home_care", Stays: "stays",
  Plumbing: "repairs", Electrical: "repairs", "AC repair": "repairs", Cleaning: "home_care", "Chef and catering": "chefs",
  Tailoring: "fashion", "Hair and beauty": "fashion", Tutoring: "learning",
  Downloads: "learning", "1-on-1 coaching": "learning", Classes: "learning", Events: "events",
};
const TYPE_CATEGORY: Record<SellerType, string> = { products: "food", service: "repairs", online: "learning" };
export const categoryFor = (type: SellerType, trades: string[]) => trades.map((t) => CHIP_CATEGORY[t]).find(Boolean) ?? TYPE_CATEGORY[type];
