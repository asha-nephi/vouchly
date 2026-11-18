import Link from "next/link";

// Calendar | List tabs for a stay, on computers.
export default function StayTabs({ id, name, on }: { id: string; name: string; on: "calendar" | "list" }) {
  const tab = (key: "calendar" | "list", label: string, href: string) => (
    <Link href={href} aria-current={on === key ? "page" : undefined} className={`flex h-9 items-center rounded-full px-4 text-sm font-bold ${on === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <div className="mb-4 hidden flex-wrap items-center justify-between gap-3 lg:flex">
      <div className="min-w-0">
        <Link href={`/shop/manage/products/${id}`} className="text-sm font-bold text-muted hover:text-ink">
          ← Edit listing
        </Link>
        <h1 className="truncate text-[26px] font-extrabold tracking-[-0.02em]">{name}</h1>
      </div>
      <nav aria-label="Calendar or list" className="flex rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
        {tab("calendar", "Calendar", `/shop/manage/products/${id}/calendar`)}
        {tab("list", "List", `/shop/manage/products/${id}/bookings`)}
      </nav>
    </div>
  );
}
