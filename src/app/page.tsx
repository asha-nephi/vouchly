// Temporary landing page until the Welcome screen is built.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8">
      <div className="flex flex-col gap-6">
        <span className="text-[15px] font-extrabold text-accent">Vouchly</span>
        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight">
          Buy and book from members you can trust.
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Food, stays, repairs and more — from verified members in your stake. Your money is held safely until you
          receive your order.
        </p>
        <ul className="flex flex-col gap-3">
          {[
            ["Verified members", "Every buyer and seller is vouched for by another member."],
            ["Money held safely", "Sellers are paid only after you tap “Received”."],
            ["Near you first", "Businesses in your area show up at the top."],
          ].map(([title, body]) => (
            <li key={title} className="rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
              <p className="text-[15px] font-bold">{title}</p>
              <p className="mt-1 text-[13px] text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 flex flex-col gap-3">
        <span className="flex h-[54px] items-center justify-center rounded-2xl bg-ink text-[15px] font-bold text-white">
          Coming soon to Lagos
        </span>
        <p className="text-center text-xs text-muted">An independent community marketplace.</p>
      </div>
    </main>
  );
}
