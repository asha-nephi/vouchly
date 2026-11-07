import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import ProductForm from "../product-form";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.shopId, shop.id), eq(products.removed, false)))
    .limit(1);
  if (!product) notFound();
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title="Edit product" href="/shop/manage" />
      <ProductForm product={product} />
    </main>
  );
}
