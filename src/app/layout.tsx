import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import NavProgress from "@/components/nav-progress";
import ToastHost from "@/components/toast";
import OfflineSupport from "@/components/offline-support";

const SITE = process.env.SITE_URL ?? "https://vouchly-af24.onrender.com";
const TITLE = "Vouchly: Buy from People You Can Trust in Lagos";
const DESCRIPTION =
  "Food, home services, classes and more from local sellers in Lagos who are vouched for by people who know them. Open to everyone. Pay safely with Paystack.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s · Vouchly" },
  description: DESCRIPTION,
  applicationName: "Vouchly",
  keywords: [
    "Vouchly",
    "Lagos marketplace",
    "trusted sellers Lagos",
    "home services Lagos",
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
        <OfflineSupport />
        {children}
      </body>
    </html>
  );
}
