import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in", description: "Log in to Vouchly with Google or your email.", alternates: { canonical: "/login" } };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
