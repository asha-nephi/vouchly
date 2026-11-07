import Image from "next/image";

// A photo sized to its box, so phones only download what they show.
// The parent needs `relative` and a set size.
export default function Photo({ src, alt = "", sizes, priority }: { src: string; alt?: string; sizes: string; priority?: boolean }) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}
