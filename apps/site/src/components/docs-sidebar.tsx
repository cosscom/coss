"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@coss/ui/components/sidebar";
import { cn } from "@coss/ui/lib/utils";
import type * as PageTree from "fumadocs-core/page-tree";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, useRef } from "react";
import { navGroups } from "@/lib/docs-tree";
import { useActiveIndicator } from "@/lib/use-active-indicator";

/** The docs sidebar of coss.com/ui: the groups of the current root folder (Guides or API Reference). */
export function DocsSidebar({
  tree,
  ...props
}: ComponentProps<typeof Sidebar> & { tree: PageTree.Root }) {
  const pathname = usePathname();
  const groups = navGroups(tree, pathname);
  const content = useRef<HTMLDivElement>(null);
  const isPage = groups.some((group) => group.pages.some((page) => page.url === pathname));
  // One highlight for the whole sidebar, sliding to the current page as you navigate.
  const indicator = useActiveIndicator(content, isPage ? pathname : null);

  return (
    <Sidebar
      className="sticky top-(--header-height) z-30 hidden h-[calc(100svh-var(--header-height))] bg-transparent lg:flex"
      collapsible="none"
      {...props}
    >
      <SidebarContent className="relative px-4 py-2" ref={content}>
        {indicator.rect && (
          <span
            aria-hidden
            className={cn(
              "absolute top-0 left-0 rounded-lg bg-sidebar-accent motion-reduce:transition-none",
              indicator.animate && "transition-[translate,width,height] duration-200 ease-out",
            )}
            style={{
              translate: `${indicator.rect.left}px ${indicator.rect.top}px`,
              width: indicator.rect.width,
              height: indicator.rect.height,
            }}
          />
        )}
        <div className="h-(--top-spacing) shrink-0" />
        {groups.map((group) => (
          <SidebarGroup className="gap-1" key={group.key}>
            <SidebarGroupLabel className="h-7 px-0 text-sidebar-accent-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.pages.map((page) => (
                  <SidebarMenuItem key={page.url}>
                    <SidebarMenuButton
                      className="h-auto min-h-8 py-1.5 ps-3.5 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
                      isActive={page.url === pathname}
                      render={<Link href={page.url} />}
                    >
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-2 overflow-visible! whitespace-normal! text-clip!">
                        {page.name}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
