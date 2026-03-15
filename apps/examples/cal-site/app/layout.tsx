import { CalSansText } from "@calcom/cal-sans-ui/text";
import { CalSansUI } from "@calcom/cal-sans-ui/ui";
import { ThemeProvider } from "@coss/ui/shared/theme-provider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description: "Cal.com - scheduling infrastructure for modern teams.",
  metadataBase: new URL("https://cal.com"),
  title: "Cal.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${CalSansUI.variable} ${CalSansText.variable} relative bg-sidebar font-light font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <div className="relative isolate flex min-h-svh flex-col overflow-clip [--header-height:5rem]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-45 mx-auto max-w-6xl before:absolute before:inset-y-0 before:-left-3 before:w-px before:bg-border/64 after:absolute after:inset-y-0 after:-right-3 after:w-px after:bg-border/64"
            />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
