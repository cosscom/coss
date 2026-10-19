"use client";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@coss/ui/components/sidebar";
import { cn } from "@coss/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type * as PageTree from "fumadocs-core/page-tree";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode, useRef, useState } from "react";
import { activeSection, type DocsSection, type NavFolder, sectionsOf } from "@/lib/docs-tree";
import { useActiveIndicator } from "@/lib/use-active-indicator";
import { SectionIcon } from "./section-icon";

/** A page link's label: wraps (long API operation names) and keeps a method badge on the right. */
const LINK_LABEL =
  "flex min-w-0 flex-1 items-start justify-between gap-2 overflow-visible! whitespace-normal! text-clip!";

/**
 * The docs sidebar of coss.com/ui: the sections (Get started, Email, …, API reference) pinned at the
 * top, then the groups of the current one. A tree with one section (Shipyard's, kloq's) shows only
 * its groups.
 */
export function DocsSidebar({
  tree,
  ...props
}: ComponentProps<typeof Sidebar> & { tree: PageTree.Root }) {
  const pathname = usePathname();
  const sections = sectionsOf(tree);
  const section = activeSection(tree, pathname);
  const groups = section?.groups ?? [];
  const content = useRef<HTMLDivElement>(null);
  const isPage = groups.some((group) => group.pages.some((page) => page.url === pathname));
  // One highlight for the whole tree, sliding to the current page as you navigate.
  const indicator = useActiveIndicator(content, isPage ? pathname : null);
  const api = section && apiLink(sections, section);

  return (
    <Sidebar
      className="sticky top-(--header-height) z-30 hidden h-[calc(100svh-var(--header-height))] bg-transparent lg:flex"
      collapsible="none"
      {...props}
    >
      {sections.length > 1 && (
        <SidebarHeader className="relative gap-0 px-4 pt-6 pb-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-border/64">
          <nav aria-label="Docs sections">
            <SidebarMenu className="gap-0.5">
              {sections.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    className="h-8 gap-2.5 px-2.5 text-muted-foreground hover:text-sidebar-accent-foreground data-[active=true]:font-normal data-[active=true]:text-sidebar-accent-foreground"
                    isActive={item.key === section?.key}
                    render={<Link href={item.url} />}
                  >
                    <SectionIcon className="size-4 shrink-0" name={item.icon} />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarHeader>
      )}
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
        {sections.length === 1 && <div className="h-(--top-spacing) shrink-0" />}
        {groups.map((group) => (
          <SidebarGroup className="gap-1" key={group.key}>
            {group.label && (
              <SidebarGroupLabel className="h-7 px-0 text-sidebar-accent-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.entries.map((entry) =>
                  entry.type === "folder" ? (
                    <FolderEntry folder={entry} key={entry.key} pathname={pathname} />
                  ) : (
                    <SidebarMenuItem key={entry.url}>
                      <SidebarMenuButton
                        className="h-auto min-h-8 py-1.5 ps-3.5 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent"
                        isActive={entry.url === pathname}
                        render={<Link href={entry.url} />}
                      >
                        <span className={LINK_LABEL}>{entry.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {api && (
          <SidebarGroup className="mt-2">
            <Link
              className="group/api flex items-center gap-1.5 ps-3.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
              href={api.url}
            >
              {api.label}
              <HugeiconsIcon
                aria-hidden
                className="size-3.5 transition-transform group-hover/api:translate-x-0.5 motion-reduce:transition-none"
                icon={ArrowRight01Icon}
                strokeWidth={2}
              />
            </Link>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

/**
 * An API resource: its operations under a toggle, open while you're on one of them (and once you
 * open it, until you close it).
 */
function FolderEntry({ folder, pathname }: { folder: NavFolder; pathname: string }) {
  const holdsPage = folder.pages.some((page) => page.url === pathname);
  const [open, setOpen] = useState(holdsPage);
  // Navigating into the folder from elsewhere (search, a link in a page) opens it.
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    if (holdsPage) setOpen(true);
  }

  return (
    <SidebarMenuItem>
      <Collapsible onOpenChange={setOpen} open={open}>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton className="group/folder h-8 gap-2 ps-3.5 hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent" />
          }
        >
          <span className="flex-1 truncate">{folder.name}</span>
          <span className="text-muted-foreground/72 text-xs tabular-nums">
            {folder.pages.length}
          </span>
          <HugeiconsIcon
            aria-hidden
            className="size-3.5! text-muted-foreground transition-transform duration-200 group-data-panel-open/folder:rotate-90 motion-reduce:transition-none"
            icon={ArrowRight01Icon}
            strokeWidth={2}
          />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <SidebarMenuSub className="me-0 gap-0.5 pe-0">
            {folder.pages.map((page) => (
              <SidebarMenuSubItem key={page.url}>
                <SidebarMenuSubButton
                  className="h-auto min-h-7 py-1 hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent sm:h-auto"
                  isActive={page.url === pathname}
                  render={<Link href={page.url} />}
                >
                  <span className={LINK_LABEL}>{page.name}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsiblePanel>
      </Collapsible>
    </SidebarMenuItem>
  );
}

/**
 * A guide section's part of the API reference: the first operation under the API section's
 * separator of the same name ("Email" → its first resource).
 */
function apiLink(
  sections: DocsSection[],
  section: DocsSection,
): { label: ReactNode; url: string } | undefined {
  for (const other of sections) {
    if (other.key === section.key) continue;
    const group = other.groups.find((candidate) => candidate.label === section.name);
    const first = group?.pages[0];
    if (group && first) return { label: `${section.name} API reference`, url: first.url };
  }
  return undefined;
}
