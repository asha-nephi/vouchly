import { cookies } from "next/headers";

export type Density = "comfortable" | "compact";
export const DENSITY_COOKIE = "vl_density";

// Seller pages start Comfortable, admin pages start Compact, until the person picks.
export async function getDensity(area: "seller" | "admin"): Promise<Density> {
  const v = (await cookies()).get(DENSITY_COOKIE)?.value;
  if (v === "compact" || v === "comfortable") return v;
  return area === "admin" ? "compact" : "comfortable";
}
