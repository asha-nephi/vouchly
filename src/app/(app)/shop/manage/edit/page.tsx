import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import ShopForm from "../../../sell/shop-form";

export const dynamic = "force-dynamic";

export default async function EditShop() {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Edit shop" href="/shop/manage" />
      <ShopForm mode="edit" shop={shop} />
    </main>
  );
}
