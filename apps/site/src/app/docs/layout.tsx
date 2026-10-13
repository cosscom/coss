import { SidebarProvider } from "@coss/ui/components/sidebar";
import { DocsSidebar } from "@/components/docs-sidebar";
import { SiteShell } from "@/components/site-shell";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  // The docs layout of coss.com/ui: the sidebar shows the current root folder (Guides or API
  // Reference, the top-level folders with `"root": true` in their meta.json).
  return (
    <SiteShell>
      <main className="flex flex-1 flex-col">
        <SidebarProvider className="container min-h-min flex-1 items-start px-0 [--sidebar-width:220px] [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--sidebar-width:240px] lg:[--top-spacing:calc(var(--spacing)*4)]">
          <DocsSidebar tree={source.getPageTree()} />
          {/* min-w-0: a flex item, or code blocks would widen it to their longest line. */}
          <div className="h-full w-full min-w-0">{children}</div>
        </SidebarProvider>
      </main>
    </SiteShell>
  );
}
