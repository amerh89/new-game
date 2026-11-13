import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "OpeningsPro",
  title: { default: "OpeningsPro", template: "%s · OpeningsPro" },
  description:
    "A chess openings trainer for improving players: learn openings, traps and checkmates with spaced repetition. Works offline.",
  appleWebApp: {
    capable: true,
    title: "OpeningsPro",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090d13",
};

/** Applies the saved theme before the first paint, so there is no flash. */
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem("openingspro-settings")||"{}");var t=s&&s.state&&s.state.theme;if(t==="light"){document.documentElement.classList.remove("dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#f3f5f8");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
