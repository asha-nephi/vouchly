import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { collections, products } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { priceText } from "@/lib/listings";
import { myShop } from "@/lib/shops";
import SubmitButton from "@/components/submit-button";
import { BackBar } from "@/components/ui";
import CollectionForm from "../collection-form";
import { deleteCollection } from "../actions";

export const dynamic = "force-dynamic";

// Change a collection's name or what's in it, or delete it.
export default async function EditCollection({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop) redirect("/sell");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [[c], listings] = await Promise.all([
    db.select().from(collections).where(and(eq(collections.id, id), eq(collections.shopId, shop.id))).limit(1),
    db.select().from(products).where(and(eq(products.shopId, shop.id), eq(products.removed, false))).orderBy(asc(products.createdAt)),
  ]);
  if (!c) notFound();
  const picks = listings.map((l) => ({ id: l.id, name: l.name, price: priceText(l), off: !l.isActive }));

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Edit collection" href="/shop/manage/collections" />
      <div className="flex flex-col gap-4 px-4">
        <CollectionForm id={c.id} name={c.name} picked={c.productIds} listings={picks} />
        <p className="text-[13px] text-muted">The link stays the same if you change the name, so links you shared keep working.</p>
        <form action={deleteCollection} className="flex justify-center">
          <input type="hidden" name="id" value={c.id} />
          <SubmitButton pendingText="Deleting…" className="h-11 px-4 text-sm font-bold text-[#b42318]">
            Delete this collection
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
