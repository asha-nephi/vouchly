"use client";

import { useRef, useState } from "react";

// Shrinks a photo on the phone to WebP before upload (max 1200px), so it's small on slow data.
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((ok) => canvas.toBlob((b) => ok(b!), "image/webp", 0.8));
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

export default function PhotoPicker({
  name,
  keepName,
  existing = [],
  max = 3,
  label = "Photos",
  tall = false,
}: {
  name: string; // new files
  keepName: string; // existing photo urls to keep
  existing?: string[];
  max?: number;
  label?: string;
  tall?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [kept, setKept] = useState(existing);
  const [added, setAdded] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const room = max - kept.length - added.length;

  // Keep the real <input> in sync so the files submit with the form.
  function sync(next: { file: File }[]) {
    const dt = new DataTransfer();
    next.forEach((a) => dt.items.add(a.file));
    if (fileInput.current) fileInput.current.files = dt.files;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, Math.max(room, 0));
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true);
    try {
      const small = await Promise.all(picked.map(shrink));
      const next = [...added, ...small.map((file) => ({ file, url: URL.createObjectURL(file) }))];
      setAdded(next);
      sync(next);
    } finally {
      setBusy(false);
    }
  }

  function removeAdded(i: number) {
    const next = added.filter((_, j) => j !== i);
    setAdded(next);
    sync(next);
  }

  const box = tall ? "h-[150px] w-full" : "size-[88px]";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-bold">{label}</span>
      <div className="flex flex-wrap gap-2.5">
        {kept.map((url) => (
          <div key={url} className={`relative ${box} overflow-hidden rounded-2xl bg-chip`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            <input type="hidden" name={keepName} value={url} />
            <RemoveButton onClick={() => setKept(kept.filter((k) => k !== url))} />
          </div>
        ))}
        {added.map((a, i) => (
          <div key={a.url} className={`relative ${box} overflow-hidden rounded-2xl bg-chip`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.url} alt="" className="size-full object-cover" />
            <RemoveButton onClick={() => removeAdded(i)} />
          </div>
        ))}
        {room > 0 && (
          <label
            className={`${box} flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-[#a3abba] bg-white text-accent`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-xs font-bold">{busy ? "Adding…" : "Add"}</span>
            <input type="file" accept="image/*" multiple={max > 1} onChange={onPick} className="sr-only" />
          </label>
        )}
      </div>
      {/* The files that actually get sent */}
      <input ref={fileInput} type="file" name={name} multiple hidden />
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove photo"
      className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink/80 text-white"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
