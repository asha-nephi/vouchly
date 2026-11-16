import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar } from "@/components/ui";
import { loadSellerOrder, OrderDetail } from "./order-detail";

export const dynamic = "force-dynamic";

export default async function SellerOrder({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { code } = await params;
  const data = await loadSellerOrder(shop, code);
  if (!data) notFound();
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title={`Order ${data.o.code}`} href="/shop/manage/orders" />
      <div className="flex flex-col gap-4 px-4">
        <OrderDetail data={data} />
      </div>
    </main>
  );
}
