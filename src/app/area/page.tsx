import { requireUser } from "@/lib/auth";
import { AREAS } from "@/lib/catalog";
import { setArea } from "./actions";
import { BackBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AreaPicker() {
  const user = await requireUser();
  const current = user.area ?? "Ikeja";
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <BackBar title="Your area" href="/home" />
      <p className="px-4 pb-3 text-sm text-muted">Shops in your area show first.</p>
      <form action={setArea} className="grid grid-cols-2 gap-2.5 px-4">
        {AREAS.map((a) => (
          <button
            key={a}
            type="submit"
            name="area"
            value={a}
            aria-pressed={a === current}
            className={`h-[52px] rounded-2xl text-[15px] font-bold ${a === current ? "bg-ink text-white" : "bg-white shadow-[0_1px_3px_rgba(20,33,61,0.08)]"}`}
          >
            {a}
          </button>
        ))}
      </form>
    </main>
  );
}
