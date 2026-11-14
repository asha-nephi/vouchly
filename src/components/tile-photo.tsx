import Photo from "@/components/photo";
import { initials, toneFor } from "@/lib/initials";

// A listing photo, or a soft colored block with the first letters of its name.
export default function TilePhoto({ src, name, sizes, priority }: { src?: string | null; name: string; sizes: string; priority?: boolean }) {
  if (src) return <Photo src={src} alt={name} sizes={sizes} priority={priority} />;
  return (
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-2xl font-extrabold text-white/90" style={{ background: toneFor(name) }}>
      {initials(name)}
    </span>
  );
}
