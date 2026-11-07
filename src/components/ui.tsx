import Link from "next/link";

// Shared Style C pieces.

export function BackBar({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex h-16 items-center gap-2 px-3">
      <Link
        href={href}
        aria-label="Back"
        className="flex size-11 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(20,33,61,0.12)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <h1 className="text-lg font-extrabold">{title}</h1>
    </div>
  );
}

export function Field(props: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  inputMode?: "text" | "tel" | "numeric";
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  const { label, name, hint, required = true, ...rest } = props;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold">
        {label}
        {!required && <span className="font-medium text-muted"> (optional)</span>}
      </span>
      <input
        name={name}
        required={required}
        {...rest}
        className="h-[52px] rounded-[14px] border border-[#d5dae4] bg-white px-3.5 text-[15px] outline-none placeholder:text-[#8a93a5] focus:border-ink focus:ring-2 focus:ring-ink/10"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PrimaryButton({ children, pending }: { children: React.ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-[54px] w-full rounded-2xl bg-ink text-[15px] font-bold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function Note({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" | "green" }) {
  const bg = { blue: "bg-soft", amber: "bg-[#fdf0d5]", green: "bg-[#ddf3e4]" }[tone];
  return <div className={`rounded-[18px] ${bg} px-4 py-3.5 text-[13px] leading-relaxed`}>{children}</div>;
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[14px] bg-[#fbebeb] px-4 py-3 text-[13px] font-semibold text-[#b42318]">
      {message}
    </p>
  );
}

export function Footer() {
  return (
    <footer className="mt-8 border-t border-line px-5 py-6 text-center text-xs leading-relaxed text-muted">
      <p>Vouchly · 57 Seriki Aro Avenue, Ikeja, Lagos, Nigeria 100282</p>
      <p className="mt-1">
        <Link href="/contact" className="font-semibold text-accent">
          Contact
        </Link>{" "}
        · An independent community marketplace.
      </p>
    </footer>
  );
}
