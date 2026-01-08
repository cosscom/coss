import "./globals.css";

import { ToastProvider } from "@coss/ui/components/toast";
import { fontHeading, fontSans } from "@coss/ui/fonts";
import { ThemeProvider } from "@coss/ui/shared/theme-provider";
import type { Metadata } from "next";
import { AppCommand } from "@/components/app-command";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileFooter } from "@/components/mobile-footer";
import { MobileHeader } from "@/components/mobile-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
        className={`${fontHeading.variable} ${fontSans.variable} relative bg-sidebar font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <AppCommand />
            <SidebarProvider>
              <MobileHeader />
              <AppSidebar />
              <SidebarInset className="max-md:pt-14">{children}</SidebarInset>
              <MobileFooter />
            </SidebarProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
