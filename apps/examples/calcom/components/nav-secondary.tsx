"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useIsBetweenMdAndLg } from "@/hooks/use-mobile";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const isBetweenMdAndLg = useIsBetweenMdAndLg();

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
              <span className="md:max-lg:hidden lg:inline">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
