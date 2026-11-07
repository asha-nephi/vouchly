import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Footer } from "@/components/ui";

export const dynamic = "force-dynamic";

const tiles = [
  { label: "Food & drinks", bg: "bg-[#f3e2b8]", h: "h-[150px]", icon: "M6 3h12l-1.5 18h-9zM6.5 8h11" },
  { label: "Repairs", bg: "bg-soft", h: "h-[130px]", icon: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" },
  { label: "Stays", bg: "bg-[#cfe3d8]", h: "h-[130px]", icon: "M3 11l9-7 9 7M5 10v10h14V10" },
  { label: "Fashion", bg: "bg-[#f5d6cc]", h: "h-[150px]", icon: "M8 3l4 3 4-3 5 4-3 3v11H6V10L3 7z" },
];

function Tile({ t }: { t: (typeof tiles)[number] }) {
  return (
    <div className={`${t.bg} ${t.h} flex flex-col justify-end rounded-[22px] p-4`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14213d" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d={t.icon} />
      </svg>
      <span className="mt-2 text-[13px] font-bold">{t.label}</span>
    </div>
  );
}

export default async function Welcome() {
  if (await currentUser()) redirect("/home");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex flex-1 flex-col gap-6 px-4 pt-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-2.5">
            <Tile t={tiles[0]} />
            <Tile t={tiles[1]} />
          </div>
          <div className="flex flex-col gap-2.5 pt-7">
            <Tile t={tiles[2]} />
            <Tile t={tiles[3]} />
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-1.5">
          <span className="text-[15px] font-extrabold text-accent">Vouchly</span>
          <h1 className="text-[30px] font-extrabold leading-[1.12] tracking-tight">
            Buy and book from members you can trust.
          </h1>
          <p className="text-[15px] leading-relaxed text-muted">
            Food, stays, repairs and more — from verified members in your stake.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 px-4 pb-2 pt-6">
        <Link href="/join" className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white">
          Join with an invite
        </Link>
        <Link
          href="/login"
          className="flex h-[54px] items-center justify-center rounded-2xl border border-[#d5dae4] bg-white text-[15px] font-bold"
        >
          I already have an account
        </Link>
      </div>
      <Footer />
    </main>
  );
}
