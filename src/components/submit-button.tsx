"use client";

import { useFormStatus } from "react-dom";

// A submit button that shows it's working and can't be tapped twice.
export default function SubmitButton({ className, children, pendingText = "Please wait…" }: { className?: string; children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
