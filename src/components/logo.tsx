// The Vouchly mark: a V whose right arm is a tick.
export function LogoMark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="24" fill={light ? "#fff" : "#14213D"} />
      <path d="M25 33 L45 72" stroke={light ? "#2A4BD7" : "#AFC0FF"} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M45 72 L76 25" stroke={light ? "#14213D" : "#fff"} strokeWidth="13" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-xl font-extrabold tracking-tight text-ink">Vouchly</span>
    </span>
  );
}
