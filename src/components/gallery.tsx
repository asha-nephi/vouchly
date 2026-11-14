"use client";

import { useRef, useState } from "react";
import TilePhoto from "@/components/tile-photo";

// Swipe photos with CSS scroll-snap. Dots show where you are.
export default function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = photos.length ? photos : [null];
  return (
    <>
      <div
        ref={box}
        onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="shimmer hide-scroll flex h-[360px] snap-x snap-mandatory overflow-x-auto md:h-[420px]"
      >
        {list.map((src, i) => (
          <div key={src ?? "none"} className="relative h-full w-full shrink-0 snap-center">
            <TilePhoto src={src} name={name} sizes="(min-width: 1200px) 52rem, (min-width: 768px) 44rem, 100vw" priority={i === 0} />
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5" aria-hidden="true">
          {list.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i === at ? "w-5 bg-white" : "w-1.5 bg-white/55"}`} />
          ))}
        </div>
      )}
    </>
  );
}
