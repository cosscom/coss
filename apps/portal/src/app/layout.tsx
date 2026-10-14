import "./globals.css";
import { fontMono, fontSans } from "@coss/ui/fonts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Webhooks", template: "%s · Webhooks" },
  // A portal is reached by its signed link only.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${fontSans.variable} ${fontMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
