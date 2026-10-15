import { Card, CardFrame, CardPanel } from "@coss/ui/components/card";
import { ScrollArea } from "@coss/ui/components/scroll-area";
import { SidebarProvider } from "@coss/ui/components/sidebar";
import type * as PageTree from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";
import type { CSSProperties, ReactNode } from "react";
import { DOCS_SIDEBAR_WIDTH } from "@/lib/nav";
import { DocsCopyPage } from "./docs-copy-page";
import { DocsSidebar } from "./docs-sidebar";
import { DocsTableOfContents } from "./docs-toc";
import { DocsFooter } from "./site-footer";

/**
 * The docs layout of coss.com/ui, shared by coss's docs and Shipyard's: the sidebar (the current
 * root folder's groups) beside the page.
 */
export function DocsLayoutFrame({ tree, children }: { tree: PageTree.Root; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <SidebarProvider
        className="container min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--top-spacing:calc(var(--spacing)*4)]"
        style={{ "--sidebar-width": DOCS_SIDEBAR_WIDTH } as CSSProperties}
      >
        <DocsSidebar tree={tree} />
        {/* min-w-0: a flex item, or code blocks would widen it to their longest line. */}
        <div className="h-full w-full min-w-0">{children}</div>
      </SidebarProvider>
    </main>
  );
}

/**
 * The docs page of coss.com/ui: the card-framed page with its title, description and
 * "Copy Markdown", the footer in the frame, and the "On This Page" table of contents beside it.
 */
export function DocsPageFrame({
  title,
  description,
  markdown,
  toc,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** The page as Markdown, for "Copy Markdown". */
  markdown: string;
  toc: TOCItemType[];
  children: ReactNode;
}) {
  return (
    <div className="flex items-stretch xl:w-full" data-slot="docs">
      <div className="relative flex w-full min-w-0 flex-1 flex-col lg:mt-8 lg:mr-4 lg:mb-8">
        <CardFrame className="border-sidebar-border shadow-lg/5 max-lg:border-none dark:bg-background">
          <Card className="max-lg:rounded-none! dark:bg-background max-lg:[clip-path:none]!">
            <CardPanel className="px-4 py-6 sm:px-6 lg:p-8">
              <div className="mx-auto w-full max-w-3xl">
                <div className="flex min-w-0 flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                      <h1 className="scroll-m-20 font-bold font-heading text-3xl xl:text-4xl">
                        {title}
                      </h1>
                      {description && (
                        <p className="text-muted-foreground sm:text-lg">{description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                      <DocsCopyPage page={markdown} />
                    </div>
                  </div>
                  <div className="w-full flex-1 *:data-[slot=alert]:first:mt-0">{children}</div>
                </div>
              </div>
            </CardPanel>
          </Card>
          <div className="px-4 py-6 lg:rounded-b-2xl lg:px-8">
            <DocsFooter />
          </div>
        </CardFrame>
      </div>
      <div className="sticky top-(--header-height) z-30 ms-auto hidden h-[calc(100svh-var(--header-height))] w-72 flex-col overflow-hidden overscroll-none xl:flex">
        <ScrollArea
          className="**:data-[slot=scroll-area-scrollbar]:hidden"
          overscrollContain
          scrollFade
        >
          <div className="flex min-h-0 flex-col gap-2 py-2">
            <div className="h-(--top-spacing) shrink-0" />
            {toc.length > 0 && <DocsTableOfContents toc={toc} />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
