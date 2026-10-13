import "./landing.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteShell } from "@/components/site-shell";
import { SHIPYARD, SHIPYARD_LINKS } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";

// The landing page (the fonts come from ../layout.tsx, the page's styles from ./landing.css) in
// the site's shell, with Shipyard's header links; its ⌘K menu searches Shipyard's docs.
export default function Layout({ children }: LayoutProps<"/shipyard">) {
  return (
    <SiteShell
      github={{ repo: SHIPYARD.githubRepo, href: SHIPYARD.github }}
      items={SHIPYARD_LINKS}
      searchApi={SHIPYARD.searchApi}
      tree={shipyardSource.getPageTree()}
    >
      {children}
      <SiteFooter />
    </SiteShell>
  );
}
