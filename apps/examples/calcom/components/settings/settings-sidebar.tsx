"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { SettingsNavContent } from "@/components/settings/settings-nav-section";
import { SettingsSheet } from "@/components/settings/settings-sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function SettingsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex flex-col gap-1 px-2">
          <SidebarMenuButton
            render={<Link aria-label="Back" href="/event-types" />}
            tooltip="Back"
          >
            <ArrowLeftIcon className="lg:-ms-0.5" />
            <span className="max-lg:sr-only">Back</span>
          </SidebarMenuButton>
          <div className="max-md:hidden lg:hidden">
            <SettingsSheet />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 max-lg:hidden">
        <SettingsNavContent />
      </SidebarContent>
    </Sidebar>
  );
}
