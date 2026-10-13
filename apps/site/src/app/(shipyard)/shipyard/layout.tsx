import "./landing.css";
import { fontCalSans } from "@coss/ui/fonts";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { baseOptions } from "@/lib/layout.shared";
import { SHIPYARD } from "@/lib/shipyard";

// The landing page's own faces: Cal Sans for the headlines, JetBrains Mono as at berthd.app (its
// body sans is the site's Inter).
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

/** Header links of Shipyard's landing page: its docs, the download, and its repository. */
const links: BaseLayoutProps["links"] = [
  { text: "Docs", url: SHIPYARD.docs, external: true },
  { text: "Download", url: `${SHIPYARD.path}#install-now` },
  { text: "GitHub", url: SHIPYARD.github, external: true },
];

export default function Layout({ children }: LayoutProps<"/shipyard">) {
  return (
    <HomeLayout
      {...baseOptions()}
      className={`${fontCalSans.variable} ${mono.variable}`}
      links={links}
    >
      {children}
      <SiteFooter />
    </HomeLayout>
  );
}
