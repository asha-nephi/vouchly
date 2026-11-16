import Link from "next/link";

type Step = { label: string; sub: string; done: boolean; href?: string; urgent?: boolean; optional?: boolean };

// "Finish your shop": what's left after sign-up. Hides once everything is done.
export default function SetupChecklist(props: {
  confirmed: boolean;
  justMade: boolean;
  listings: number;
  hasPayout: boolean;
  hold: boolean;
  delivers: boolean;
  deliveryTouched: boolean;
  deliveryLine: string;
  hasPhoto: boolean;
  shareUrl: string;
  help: string | null;
}) {
  const steps: Step[] = [
    { label: "Shop made", sub: "Your shop has a name and an area.", done: true },
    { label: "Add your first listing", sub: "A photo, a name and a price.", done: props.listings > 0, href: "/shop/manage/products/new" },
    {
      label: "Add your bank account",
      sub: props.hold ? "So we can pay you. Until then, Vouchly keeps your money safe." : "Buyers can't pay you until you add it.",
      done: props.hasPayout,
      href: "/shop/manage/payout",
      urgent: !props.hold,
    },
    ...(props.delivers
      ? [{ label: "Check delivery and pickup", sub: props.deliveryLine, done: props.deliveryTouched, href: "/shop/manage/delivery" }]
      : []),
    { label: "Add a shop photo", sub: "Shops with a photo get more visits.", done: props.hasPhoto, href: "/shop/manage/edit", optional: true },
    {
      label: "Ward contact confirms you",
      sub: props.confirmed ? "You're confirmed." : "Buyers see your shop once this is done. We'll tell you.",
      done: props.confirmed,
    },
  ];
  const left = steps.filter((s) => !s.done);
  if (left.length === 0 && !props.justMade) return null;
  const doneCount = steps.length - left.length;

  return (
    <section className="rounded-[22px] border border-line bg-white p-[18px]">
      {props.justMade && (
        <div className="mb-4 rounded-[18px] bg-[#ddf3e4] p-4">
          <p className="text-lg font-extrabold text-[#14532d]">Your shop is ready</p>
          <p className="mt-1 text-[13px] leading-snug text-[#1b6b3a]">
            {props.confirmed ? "Share it on WhatsApp so people can order." : "Buyers will see it as soon as your ward contact confirms you. Finish the list below while you wait."}
          </p>
          {props.confirmed && (
            <a href={props.shareUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-12 items-center justify-center rounded-xl bg-[#1F7A46] text-sm font-extrabold text-white">
              Share on WhatsApp
            </a>
          )}
        </div>
      )}
      {left.length > 0 && (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Finish your shop</h2>
            <span className="text-[13px] font-bold text-muted">
              {doneCount} of {steps.length} done
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded bg-[#e6e9ef]" aria-hidden="true">
            <div className="h-full rounded bg-[#1F7A46]" style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }} />
          </div>
          <ul className="mt-2">
            {steps.map((s) => {
              const body = (
                <>
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-[#1b6b3a] text-white" : s.urgent ? "border-2 border-[#B42318]" : "border-2 border-[#c8ceda]"}`}
                    aria-hidden="true"
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-bold ${s.done ? "text-muted line-through decoration-1" : ""}`}>
                      {s.label}
                      {s.optional && !s.done && <span className="font-medium text-muted"> (optional)</span>}
                    </span>
                    {!s.done && <span className={`block text-[13px] leading-snug ${s.urgent ? "font-bold text-[#B42318]" : "text-muted"}`}>{s.sub}</span>}
                  </span>
                  {!s.done && s.href && <span aria-hidden="true" className="text-muted">›</span>}
                </>
              );
              return (
                <li key={s.label} className="border-b border-line last:border-0">
                  {!s.done && s.href ? (
                    <Link href={s.href} className="flex min-h-14 items-center gap-3 py-2.5">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {props.help && (
        <p className="mt-3 text-center text-[13px] text-muted">
          Stuck?{" "}
          <a href={props.help} target="_blank" rel="noopener noreferrer" className="font-bold text-accent">
            Chat with us on WhatsApp
          </a>
        </p>
      )}
    </section>
  );
}
