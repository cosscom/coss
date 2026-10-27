import "./global.css";
import { fontMono, fontSans } from "@coss/ui/fonts";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  // Pages that set their own `openGraph` replace this one, so they set `type` too: in-app browsers
  // read `og:type` and throw when it's missing.
  openGraph: { type: "website", siteName: SITE_NAME },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes (inside RootProvider) sets the `dark` class before hydration.
    <html
      className={`${fontSans.variable} ${fontMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      {/* The header and page frame are each route group's `SiteShell` (src/components/site-shell.tsx). */}
      <body className="relative bg-sidebar font-sans text-foreground antialiased">
        {/* Fumadocs' own search dialog stays off: the header's command menu searches instead. */}
        <RootProvider search={{ enabled: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
