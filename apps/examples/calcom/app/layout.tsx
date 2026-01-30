import "./globals.css";

import { ToastProvider } from "@coss/ui/components/toast";
import {
  fontHeading,
  fontSans,
  fontSans1,
  fontSans2,
  fontSansInter,
} from "@coss/ui/fonts";
import { FontProvider } from "@coss/ui/shared/font-provider";
import { FontSwitcher } from "@coss/ui/shared/font-switcher";
import { ThemeProvider } from "@coss/ui/shared/theme-provider";
import type { Metadata } from "next";
import { AppCommand } from "@/components/app/app-command";
import { DebugProvider } from "@/components/debug-context";

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
      className={`${fontSans.variable} ${fontSans1.variable} ${fontSans2.variable} ${fontSansInter.variable} ${fontHeading.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="relative bg-sidebar font-sans text-foreground antialiased">
        <ThemeProvider>
          <FontProvider>
            <FontSwitcher side="right" />
            <ToastProvider>
              <DebugProvider>
                <AppCommand />
                {children}
              </DebugProvider>
            </ToastProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
