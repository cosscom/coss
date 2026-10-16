"use client";

import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ACCOUNT_NAV,
  ADMIN_NAV,
  activeNavItem,
  DOMAIN_NAV,
  type NavItem,
  ORGANIZATION_SETTINGS_NAV,
} from "@/lib/navigation";

/** Navigation lists by name: server components can't pass `NavItem`s (icons are functions). */
const NAVS = {
  account: ACCOUNT_NAV,
  admin: ADMIN_NAV,
  domain: DOMAIN_NAV,
  organizationSettings: ORGANIZATION_SETTINGS_NAV,
} as const satisfies Record<string, NavItem[]>;

/**
 * Route tabs under a page header (an area's sub-pages), underlined like coss ui's tabs. Name the
 * list with `nav` (from server components; `paths` keeps only those items, e.g. the ones the
 * member may see) or pass `items` from client components.
 */
export function SubNav(
  props: { base: string; className?: string } & (
    | { nav: keyof typeof NAVS; paths?: string[] }
    | { items: NavItem[] }
  ),
) {
  const pathname = usePathname();
  const items =
    "items" in props
      ? props.items
      : NAVS[props.nav].filter((item) => !props.paths || props.paths.includes(item.path));
  const active = activeNavItem(pathname, props.base, items);
  // The tabs scroll sideways on narrow screens. The underline sits 1px below the list to cover a
  // border (`className="border-b"`), so the scroller reaches 1px over that border (`-mb-px pb-px`)
  // or the underline would overflow it and add a vertical scrollbar.
  return (
    <div className={cn("-mx-1", props.className)}>
      <Tabs className="-mb-px overflow-x-auto pb-px" value={active?.path ?? null}>
        <TabsList variant="underline">
          {items.map((item) => (
            <TabsTab
              key={item.path}
              nativeButton={false}
              render={<Link href={props.base + item.path} />}
              value={item.path}
            >
              {item.label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
