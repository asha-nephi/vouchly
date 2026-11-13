import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import ProductForm from "../product-form";
import { MAX_FILE_MB } from "@/lib/files";

export const dynamic = "force-dynamic";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ first?: string; kind?: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { first, kind } = await searchParams;
  // Start with what this kind of shop usually lists.
  const guess = kind === "stay" || kind === "service" || kind === "item" || kind === "digital" ? kind : shop.category === "stays" ? "stay" : ["repairs", "home_care", "events", "chefs"].includes(shop.category) ? "service" : shop.category === "learning" ? "digital" : "item";
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title="Add a listing" href="/shop/manage" />
      <ProductForm maxFileMb={MAX_FILE_MB} first={first === "1"} defaultKind={guess} />
    </main>
  );
}
