import "@coss/ui/globals.css";
import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "COSS", template: "%s · COSS" },
  description: "One API key and one SDK for email and more.",
  // Served by the site (it owns coss.com's root files, see ZONE_ROUTES in @coss/auth/slugs).
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className={`${sans.variable} ${mono.variable}`} lang="en">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
