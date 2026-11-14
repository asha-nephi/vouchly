import { SideShell } from "@/components/seller-sidebar";

// Admin pages use the same sidebar layout on computers. Each page still checks who can see it.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const card = (
    <div className="rounded-[14px] bg-white/8 p-3">
      <span className="block text-sm font-extrabold">Admin</span>
      <span className="block text-xs font-bold text-[#AFC0F5]">Members and problems</span>
    </div>
  );
  return (
    <SideShell
      card={card}
      items={[
        { href: "/admin/members", label: "Members" },
        { href: "/admin/problems", label: "Problems" },
      ]}
      foot={[
        { href: "/shop/manage", label: "My shop" },
        { href: "/home", label: "Switch to buying" },
      ]}
    >
      {children}
    </SideShell>
  );
}
