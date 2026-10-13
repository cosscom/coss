import "@/components/shipyard/docs/docs.css";
import "@/components/shipyard/docs/diagram.css";
import "@/components/shipyard/docs/scenes.css";
import type { DefaultSearchDialogProps } from "fumadocs-ui/components/dialog/search-default";
import { SearchProvider } from "fumadocs-ui/contexts/search";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { LegalLinks } from "@/components/site-footer";
import { SHIPYARD, SHIPYARD_LINKS } from "@/lib/shipyard";
import { shipyardSource } from "@/lib/shipyard-docs";

export default function Layout({ children }: LayoutProps<"/shipyard/docs">) {
  // The root provider's search dialog indexes coss's docs (/docs/search.json); this one, nearer,
  // Shipyard's.
  return (
    <SearchProvider<DefaultSearchDialogProps> options={{ api: SHIPYARD.searchApi }}>
      <DocsLayout
        tree={shipyardSource.getPageTree()}
        nav={{
          title: <span className="font-semibold tracking-tight">{SHIPYARD.name}</span>,
          url: SHIPYARD.path,
        }}
        links={SHIPYARD_LINKS}
        sidebar={{
          footer: (
            <LegalLinks className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-muted-foreground text-xs" />
          ),
        }}
      >
        {children}
      </DocsLayout>
    </SearchProvider>
  );
}
