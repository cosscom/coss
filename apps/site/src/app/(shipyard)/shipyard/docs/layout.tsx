import "@/components/shipyard/docs/docs.css";
import "@/components/shipyard/docs/diagram.css";
import "@/components/shipyard/docs/scenes.css";
import { DocsLayoutFrame } from "@/components/docs-frame";
import { SiteShell } from "@/components/site-shell";
import { SHIPYARD, SHIPYARD_LINKS } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";

export default function Layout({ children }: LayoutProps<"/shipyard/docs">) {
  // The same docs layout as /docs, over Shipyard's tree (every folder is a sidebar group) and its
  // own search index (/shipyard/docs/search.json).
  const tree = shipyardSource.getPageTree();
  return (
    <SiteShell
      github={{ repo: SHIPYARD.githubRepo, href: SHIPYARD.github }}
      items={SHIPYARD_LINKS}
      searchApi={SHIPYARD.searchApi}
      tree={tree}
    >
      <DocsLayoutFrame tree={tree}>{children}</DocsLayoutFrame>
    </SiteShell>
  );
}
