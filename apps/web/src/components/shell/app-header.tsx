"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@coss/ui/components/breadcrumb";
import { SidebarTrigger } from "@coss/ui/components/sidebar";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { segmentLabel } from "@/lib/navigation";
import { CommandMenu, type CommandMenuData } from "./command-menu";

type Crumb = { label: string; href: string; mono: boolean };

/**
 * The trail to the current page from its path. `names` labels dynamic segments by the path they
 * end (`/acme` → "Acme", `/acme/projects/web` → "Web"); unnamed dynamic segments (ids) show in
 * mono. The `projects` segment is skipped: a project is named by its own crumb.
 */
function crumbsFor(pathname: string, names: Record<string, string>): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  segments.forEach((segment, index) => {
    if (segment === "projects" && index === 1) return;
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const named = names[href] ?? segmentLabel(segment);
    crumbs.push({ label: named ?? decodeURIComponent(segment), href, mono: !named });
  });
  return crumbs;
}

/** The bar at the top of the content frame: sidebar toggle, breadcrumbs and search. */
export function AppHeader(props: { names: Record<string, string>; command: CommandMenuData }) {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname, props.names);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 rounded-t-[inherit] border-b bg-background/88 px-3 backdrop-blur-sm sm:px-4">
      <SidebarTrigger className="-ms-1" />
      <div aria-hidden className="h-4 w-px bg-border" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            // Small screens keep the last two crumbs.
            const hidden = index < crumbs.length - 2 ? "max-md:hidden" : undefined;
            const label = (
              <span
                className={cn(
                  "block truncate",
                  crumb.mono ? "max-w-40 font-mono text-xs" : "max-w-48",
                )}
              >
                {crumb.label}
              </span>
            );
            return (
              <Fragment key={crumb.href}>
                {index > 0 ? (
                  // The separator before the first visible crumb goes with the hidden ones.
                  <BreadcrumbSeparator
                    className={index <= crumbs.length - 2 ? "max-md:hidden" : undefined}
                  />
                ) : null}
                <BreadcrumbItem className={cn("min-w-0", hidden)}>
                  {last ? (
                    <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>{label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <CommandMenu data={props.command} />
    </header>
  );
}
