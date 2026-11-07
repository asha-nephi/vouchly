import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vouchly — buy from members you can trust",
  description: "Food, stays, repairs and more from verified members in your community.",
};

export const viewport: Viewport = { themeColor: "#14213d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
