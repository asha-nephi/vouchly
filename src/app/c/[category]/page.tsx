import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { browse } from "@/lib/browse";
import { CATEGORIES } from "@/lib/catalog";
import { ShopRow } from "@/components/shop-card";
import { BackBar, Note } from "@/components/ui";
import TabBar from "@/components/tab-bar";

export const dynamic = "force-dynamic";

export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const user = await requireUser();
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) notFound();
  const area = user.area ?? "Ikeja";
  const { near, more } = await browse(area, cat.id);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <BackBar title={cat.label} href="/home" />
      <div className="flex flex-col gap-3 px-4">
        {cat.id === "food" && <Note>Most food sellers take pre-orders and deliver on set days. Check each shop&apos;s order deadline.</Note>}
        <h2 className="pt-1 text-[17px] font-extrabold">Near you in {area}</h2>
        {near.length === 0 && (
          <p className="rounded-[20px] border-[1.5px] border-dashed border-[#c8ceda] p-5 text-center text-[13px] text-muted">
            No {cat.label.toLowerCase()} shops in {area} yet.
          </p>
        )}
        {near.map((s) => (
          <ShopRow key={s.id} s={s} />
        ))}
        {more.length > 0 && (
          <>
            <h2 className="pt-2 text-[15px] font-bold text-muted">More in Lagos</h2>
            {more.map((s) => (
              <ShopRow key={s.id} s={s} />
            ))}
          </>
        )}
      </div>
      <TabBar active="Home" />
    </main>
  );
}
