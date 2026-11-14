"use client";

// A GET form that applies itself as soon as a choice changes.
export default function AutoSubmit({ action, className, children }: { action: string; className?: string; children: React.ReactNode }) {
  return (
    <form action={action} className={className} onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
    </form>
  );
}
