"use client";

import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";
import { cn } from "@coss/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavItem, type NavItem } from "@/lib/navigation";

/** Route tabs under a page header (an area's sub-pages), underlined like coss ui's tabs. */
export function SubNav(props: { base: string; items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  const active = activeNavItem(pathname, props.base, props.items);
  return (
    <Tabs className={cn("-mx-1 overflow-x-auto", props.className)} value={active?.path ?? null}>
      <TabsList variant="underline">
        {props.items.map((item) => (
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
  );
}
