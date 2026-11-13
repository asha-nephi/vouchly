import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import NavProgress from "@/components/nav-progress";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";
const TITLE = "Vouchly: buy from people your ward can vouch for";
const DESCRIPTION =
  "Food, shortlets and services like plumbing and repairs, from confirmed members in Lagos. Pay safely through Paystack. Join with an invite from a member.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s · Vouchly" },
  description: DESCRIPTION,
  applicationName: "Vouchly",
  keywords: [
    "Vouchly",
    "Lagos marketplace",
    "trusted sellers Lagos",
    "LDS members Lagos",
    "shortlet Ikeja",
    "tigernut Lagos",
    "plumber Lagos",
    "buy from members",
  ],
  openGraph: {
    type: "website",
    siteName: "Vouchly",
    locale: "en_NG",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Vouchly", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // App pages need a login, so only the public pages are listed for search.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#14213d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body className="antialiased">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
