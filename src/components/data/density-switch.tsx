import { setDensity } from "./actions";
import type { Density } from "./density";

// Comfortable / Compact. Computers only (it lives in the sidebar, which phones never see).
export function DensitySwitch({ value, dark = false }: { value: Density; dark?: boolean }) {
  const opts: { v: Density; label: string }[] = [
    { v: "comfortable", label: "Comfortable" },
    { v: "compact", label: "Compact" },
  ];
  return (
    <form action={setDensity} aria-label="Table size" className={`grid grid-cols-2 gap-0.5 rounded-full p-0.5 ${dark ? "bg-white/10" : "bg-chip"}`}>
      {opts.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            name="density"
            value={o.v}
            aria-pressed={on}
            className={`h-8 rounded-full px-2.5 text-xs font-bold transition ${on ? (dark ? "bg-white text-ink" : "bg-white text-ink shadow-sm") : dark ? "text-[#C9D3EE] hover:text-white" : "text-muted hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </form>
  );
}
