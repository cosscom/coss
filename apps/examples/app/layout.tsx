import "./globals.css";

import { ToastProvider } from "@coss/ui/components/toast";
import { ThemeProvider } from "@coss/ui/shared/theme-provider";
import type { Metadata } from "next";
import localFont from "next/font/local";

const fontSans = localFont({
  display: "swap",
  src: "../../../public/fonts/CalSansUI[MODE,wght].woff2",
  variable: "--font-sans",
});

const fontHeading = localFont({
  display: "swap",
  src: "../../../public/fonts/CalSans-Regular.woff2",
  variable: "--font-heading",
});

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontHeading.variable} ${fontSans.variable} bg-sidebar font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
