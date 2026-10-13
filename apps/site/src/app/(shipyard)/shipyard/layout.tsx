import "./landing.css";
import { fontCalSans } from "@coss/ui/fonts";
import { JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteShell } from "@/components/site-shell";
import { SHIPYARD } from "@/lib/shipyard";
import type { NavItem } from "@/lib/site";

// The landing page's own faces: Cal Sans for the headlines, JetBrains Mono as at berthd.app (its
// body sans is the site's).
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

/** Header links of Shipyard's landing page: its docs, the download, and its repository. */
const links: readonly NavItem[] = [
  { label: "Docs", href: SHIPYARD.docs, external: true },
  { label: "Download", href: `${SHIPYARD.path}#install-now` },
  { label: "GitHub", href: SHIPYARD.github, external: true },
];

export default function Layout({ children }: LayoutProps<"/shipyard">) {
  return (
    <SiteShell className={`${fontCalSans.variable} ${mono.variable}`} items={links}>
      {children}
      <SiteFooter />
    </SiteShell>
  );
}
