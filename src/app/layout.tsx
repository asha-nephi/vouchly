import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import NavProgress from "@/components/nav-progress";
import ToastHost from "@/components/toast";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";
const TITLE = "Vouchly: LDS Marketplace for Latter-day Saint Entrepreneurs";
const DESCRIPTION =
  "Vouchly is the LDS marketplace for Latter-day Saint entrepreneurs in Lagos. Buy goods, hire pros and book classes from members vouched for by their ward.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s · Vouchly" },
  description: DESCRIPTION,
  applicationName: "Vouchly",
  keywords: [
    "Vouchly",
    "LDS marketplace",
    "LDS entrepreneurs",
    "LDS community",
    "LDS business directory",
    "Latter-day Saint entrepreneurs",
    "Latter-day Saint businesses",
    "LDS Lagos",
    "LDS Nigeria",
    "returned missionary business",
    "member marketplace Lagos",
    "trusted sellers Lagos",
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
        <ToastHost />
        {children}
      </body>
    </html>
  );
}
