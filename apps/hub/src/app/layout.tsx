import "./globals.css";
import { fontMono, fontSans } from "@coss/ui/fonts";
import type { Metadata } from "next";
import { Framed } from "@/components/framed";
import { HubShell } from "@/components/hub-shell";

export const metadata: Metadata = {
  title: { default: "coss.com hub", template: "%s · coss.com hub" },
  description:
    "The hub: where software is built by the crowd and opinionated by its maintainers. Open a Prompt Request, not a pull request.",
};

/* Dark by default like the rest of coss.com's tools; follows the system when it says light. */
const THEME_SCRIPT =
  "try{var l=window.matchMedia('(prefers-color-scheme: light)').matches;if(!l)document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${fontSans.variable} ${fontMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a constant, no data in it. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* The header and page frame are `HubShell` (src/components/hub-shell.tsx), the site's. */}
      <body className="relative bg-sidebar font-sans text-foreground antialiased">
        <Framed />
        <HubShell>{children}</HubShell>
      </body>
    </html>
  );
}
