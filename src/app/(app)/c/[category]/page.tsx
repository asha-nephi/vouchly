import { notFound, redirect } from "next/navigation";
import { CATEGORIES } from "@/lib/catalog";

// Categories now live inside the three sections.
const SECTION_OF: Record<string, string> = { repairs: "services", home_care: "services", chefs: "services", learning: "online", events: "online" };

export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!CATEGORIES.some((c) => c.id === category)) notFound();
  const s = SECTION_OF[category] ?? "products";
  redirect(s === "online" ? `/home?s=online` : `/home?s=${s}&cat=${category}`);
}
