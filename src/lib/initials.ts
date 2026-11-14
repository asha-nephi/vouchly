// "Mama Grace Tigernut" → "MG"
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

// Soft block colors for listings and shops with no photo. Same name, same color.
const TONES = ["#C98A4B", "#4B7FC9", "#5BA37A", "#B8658F", "#7B6BC9", "#C9674B"];
export const toneFor = (name: string) => TONES[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length];
