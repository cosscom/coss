import { cn } from "@coss/ui/lib/utils";
import type * as PageTree from "fumadocs-core/page-tree";
import type { ReactNode } from "react";
import type { NavItem } from "@/lib/site";
import type { GitHubRepo } from "./github-link";
import { SiteHeader } from "./site-header";

/**
 * The page frame of coss.com/ui: the vertical rails with their corner marks under the header, the
 * sticky header, then the page. Each route group renders it so a landing page can pass its own
 * header links and docs.
 */
export function SiteShell({
  items,
  tree,
  searchApi,
  github,
  className,
  children,
}: {
  items?: readonly NavItem[];
  /** The docs the menus list and the ⌘K menu searches (coss's docs unless given). */
  tree?: PageTree.Root;
  searchApi?: string;
  /** The repository of the GitHub link and its stars (coss's unless given). */
  github?: GitHubRepo;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex min-h-svh flex-col overflow-clip [--header-height:4rem]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="container pointer-events-none absolute inset-0 z-45 before:absolute before:inset-y-0 before:-left-3 before:w-px before:bg-border/64 after:absolute after:inset-y-0 after:-right-3 after:w-px after:bg-border/64"
      />
      <div
        aria-hidden="true"
        className="container pointer-events-none fixed inset-x-0 top-0 z-45 h-(--header-height) before:absolute before:top-[calc(var(--header-height)-4.5px)] before:-left-[11.5px] before:z-1 before:-ml-1 before:size-2 before:rounded-[2px] before:border before:border-border before:bg-popover before:bg-clip-padding before:shadow-xs/5 after:absolute after:top-[calc(var(--header-height)-4.5px)] after:-right-[11.5px] after:z-1 after:-mr-1 after:size-2 after:rounded-[2px] after:border after:border-border after:bg-background after:bg-clip-padding after:shadow-xs/5 dark:after:bg-clip-border dark:before:bg-clip-border"
      />
      <SiteHeader github={github} items={items} searchApi={searchApi} tree={tree} />
      {children}
    </div>
  );
}
