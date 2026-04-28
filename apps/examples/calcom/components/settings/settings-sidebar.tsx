"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { SettingsDrawer } from "@/components/settings/settings-drawer";
import { SettingsNavContent } from "@/components/settings/settings-nav-section";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function SettingsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>): React.ReactElement {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex flex-col gap-1 px-2 lg:px-1">
          <SidebarMenuButton
            render={<Link aria-label="Back" href="/event-types" />}
            tooltip="Back"
          >
            <ArrowLeftIcon />
            <span className="max-lg:sr-only">Back</span>
          </SidebarMenuButton>
          <div className="max-md:hidden lg:hidden">
            <SettingsDrawer />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 max-lg:hidden">
        <SettingsNavContent />
      </SidebarContent>
    </Sidebar>
  );
}
