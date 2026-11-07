import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import ProductForm from "../product-form";

export const dynamic = "force-dynamic";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ first?: string }> }) {
  const user = await requireUser();
  if (!(await myShop(user.id))) redirect("/sell");
  const { first } = await searchParams;
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title="Add a product" href="/shop/manage" />
      <ProductForm first={first === "1"} />
    </main>
  );
}
