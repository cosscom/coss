import { DocsLayoutFrame } from "@/components/docs-frame";
import { SiteShell } from "@/components/site-shell";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  // The docs layout of coss.com/ui: the sidebar shows the current root folder (Guides or API
  // Reference, the top-level folders with `"root": true` in their meta.json).
  const tree = source.getPageTree();
  return (
    <SiteShell docsSidebar tree={tree}>
      <DocsLayoutFrame tree={tree}>{children}</DocsLayoutFrame>
    </SiteShell>
  );
}
