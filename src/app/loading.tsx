// Shown at once while the next page loads, so taps feel instant.
export default function Loading() {
  const bar = "animate-pulse rounded-[14px] bg-[#e6e9ef]";
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-5" aria-busy="true" aria-label="Loading">
      <div className={`${bar} h-8 w-40`} />
      <div className={`${bar} mt-5 h-12 w-full rounded-2xl`} />
      <div className="cards mt-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
            <div className={`${bar} size-[64px] shrink-0`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`${bar} h-4 w-3/4`} />
              <div className={`${bar} h-3 w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
