import "@coss/ui/globals.css";
import { fontMono, fontSans } from "@coss/ui/fonts";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "COSS", template: "%s · COSS" },
  description: "One API key and one SDK for email and more.",
  // Served by the site (it owns coss.com's root files, see ZONE_ROUTES in @coss/auth/slugs).
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the `dark` class before hydration.
    <html
      className={`${fontSans.variable} ${fontMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-sidebar font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
