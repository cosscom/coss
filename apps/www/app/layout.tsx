import "./globals.css";

import {
  fontHeading,
  fontMono,
  fontSans,
  fontSans1,
  fontSans2,
  fontSansInter,
} from "@coss/ui/fonts";
import { FontProvider } from "@coss/ui/shared/font-provider";
import { FontSwitcher } from "@coss/ui/shared/font-switcher";
import { SiteCta } from "@coss/ui/shared/site-cta";
import { SiteFooter } from "@coss/ui/shared/site-footer";
import { SiteHeader } from "@coss/ui/shared/site-header";
import { ThemeProvider } from "@coss/ui/shared/theme-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "coss.com - the everything but AI company",
  metadataBase: new URL("https://coss.com"),
  title: "coss.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${fontSans.variable} ${fontSans1.variable} ${fontSans2.variable} ${fontSansInter.variable} ${fontMono.variable} ${fontHeading.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="relative bg-sidebar font-sans text-foreground antialiased">
        <ThemeProvider>
          <FontProvider>
            <FontSwitcher side="right" />
            <div className="relative isolate flex min-h-svh flex-col overflow-clip [--header-height:4rem]">
              <div
                aria-hidden="true"
                className="before:-left-3 after:-right-3 container pointer-events-none absolute inset-0 z-45 before:absolute before:inset-y-0 before:w-px before:bg-border/64 after:absolute after:inset-y-0 after:w-px after:bg-border/64"
              />
              <div
                aria-hidden="true"
                className="before:-left-[11.5px] before:-ml-1 after:-right-[11.5px] after:-mr-1 container pointer-events-none fixed inset-0 z-45 before:absolute before:top-[calc(var(--header-height)-4.5px)] before:z-1 before:size-2 before:rounded-[2px] before:border before:border-border before:bg-popover before:bg-clip-padding before:shadow-xs after:absolute after:top-[calc(var(--header-height)-4.5px)] after:z-1 after:size-2 after:rounded-[2px] after:border after:border-border after:bg-background after:bg-clip-padding after:shadow-xs dark:after:bg-clip-border dark:before:bg-clip-border"
              />
              <SiteHeader />
              {children}
              <SiteCta />
              <SiteFooter />
            </div>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
