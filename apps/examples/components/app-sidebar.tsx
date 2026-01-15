"use client";

import type * as React from "react";
import { DebugPopover } from "@/components/debug-popover";
import { HeaderActions } from "@/components/header-actions";
import { Logo } from "@/components/logo";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { navFooterItems, navMainItems } from "@/lib/navigation-data";

export function AppSidebar({
  variant,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  variant?: never;
}) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex flex-col items-center justify-between gap-0.5 px-2 lg:flex-row">
          <SidebarMenuButton
            className="w-fit justify-center md:max-lg:p-0"
            render={(props) => <Logo {...props} />}
          />
          <HeaderActions />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary className="mt-auto" items={navFooterItems} />
        <div className="px-3 pb-4 text-[0.625rem] text-sidebar-foreground/50 max-lg:hidden">
          © 2025 Cal.com, Inc. v.5.9.6-h-2701b4d{" - "}
          <DebugPopover />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
