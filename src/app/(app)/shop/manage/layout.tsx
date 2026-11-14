import { currentUser } from "@/lib/auth";
import { myShop } from "@/lib/shops";
import SellerSidebar from "@/components/seller-sidebar";

// Computers get the navy seller sidebar; phones keep the current pages.
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const shop = user && !user.isGuest ? await myShop(user.id) : null;
  if (!shop) return children;
  return <SellerSidebar shop={shop}>{children}</SellerSidebar>;
}
