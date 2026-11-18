import { SideShell } from "@/components/seller-sidebar";
import { DensitySwitch } from "@/components/data/density-switch";
import { getDensity } from "@/components/data/density";
import { currentUser } from "@/lib/auth";

// Admin pages use the same sidebar layout on computers. Each page still checks who can see it.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [density, me] = await Promise.all([getDensity("admin"), currentUser()]);
  const admin = me?.role === "admin";
  const card = (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-white/8 p-3">
      <span>
        <span className="block text-sm font-extrabold">Admin</span>
        <span className="block text-xs font-bold text-[#AFC0F5]">{admin ? "Running Vouchly" : "Your ward"}</span>
      </span>
      <DensitySwitch value={density} dark />
    </div>
  );
  // Ward contacts only see Members. The other pages are for the admin.
  const items = admin
    ? [
        { href: "/admin/members", label: "Members" },
        { href: "/admin/problems", label: "Problems" },
        { href: "/admin/shops", label: "Shops" },
        { href: "/admin/payments", label: "Payments" },
        { href: "/admin/invites", label: "Invites" },
      ]
    : [{ href: "/admin/members", label: "Members" }];
  return (
    <SideShell
      card={card}
      items={items}
      foot={[
        { href: "/shop/manage", label: "My shop" },
        { href: "/home", label: "Switch to buying" },
      ]}
    >
      {children}
    </SideShell>
  );
}
