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
              className="max-w-6xl pointer-events-none absolute inset-0 z-45 mx-auto before:absolute before:inset-y-0 before:-left-3 before:w-px before:bg-border/64 after:absolute after:inset-y-0 after:-right-3 after:w-px after:bg-border/64"
            />
            <div
              aria-hidden="true"
              className="max-w-6xl pointer-events-none fixed inset-0 z-45 mx-auto before:absolute before:top-[calc(var(--header-height)-4.5px)] before:-left-[11.5px] before:z-1 before:-ml-1 before:size-2 before:rounded-[2px] before:border before:border-border before:bg-popover before:bg-clip-padding before:shadow-xs after:absolute after:top-[calc(var(--header-height)-4.5px)] after:-right-[11.5px] after:z-1 after:-mr-1 after:size-2 after:rounded-[2px] after:border after:border-border after:bg-background after:bg-clip-padding after:shadow-xs dark:after:bg-clip-border dark:before:bg-clip-border"
            />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
