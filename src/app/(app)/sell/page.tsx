import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import { BackBar, Note } from "@/components/ui";
import ShopForm from "./shop-form";
import Link from "next/link";
import HelpLink from "@/components/help-link";
import { cookies } from "next/headers";
import { PATH_COOKIE, readPath } from "@/lib/seller-types";

export const dynamic = "force-dynamic";

export default async function Sell() {
  const user = await requireUser();
  if (await myShop(user.id)) redirect("/shop/manage");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackBar title="Set up your shop" href="/home" />
      {user.role === "buyer" ? (
        <div className="flex flex-col gap-3 px-4 pt-2">
          <Note tone="amber">Buyer accounts can shop and track orders. To sell, join as a member with an invite code and get confirmed by your ward contact.</Note>
          <Link href="/join" className="flex h-12 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">Join as a member</Link>
        </div>
      ) : (
        <>
          {!user.confirmed && (
            <div className="px-4 pt-2">
              <Note>Set up your shop now. Buyers will see it as soon as your ward contact confirms you.</Note>
            </div>
          )}
          <ShopForm mode="create" path={readPath((await cookies()).get(PATH_COOKIE)?.value)} />
          <HelpLink className="px-4 pb-6" />
        </>
      )}
    </main>
  );
}
