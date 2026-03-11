"use client";

import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>): React.ReactElement {
  const isBetweenMdAndLg = useMediaQuery("md:max-lg");

  return (
    <SidebarGroup {...props}>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              render={<Link href={item.url} />}
              tooltip={isBetweenMdAndLg ? item.title : undefined}
            >
              <item.icon />
              <span className="md:max-lg:sr-only lg:inline">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
