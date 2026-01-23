"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Sheet, SheetPopup, SheetTrigger } from "@coss/ui/components/sheet";
import { TooltipTrigger } from "@coss/ui/components/tooltip";
import { ExternalLinkIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { SettingsNavItem } from "@/lib/settings-navigation-data";
import { settingsNavItems } from "@/lib/settings-navigation-data";

export function SettingsSheet() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SidebarMenuButton render={<SheetTrigger />} tooltip="Menu">
        <MenuIcon />
      </SidebarMenuButton>
      <SheetPopup showCloseButton={false} side="left">
        <div className="flex flex-col gap-6 overflow-auto p-6 pt-8">
          {settingsNavItems.map((section) => (
            <SettingsSheetSection
              key={section.url}
              onNavigate={() => setOpen(false)}
              pathname={pathname}
              section={section}
            />
          ))}
        </div>
      </SheetPopup>
    </Sheet>
  );
}

function SettingsSheetSection({
  section,
  pathname,
  onNavigate,
}: {
  section: SettingsNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 font-medium text-sidebar-accent-foreground text-sm">
        {section.avatar && (
          <Avatar className="size-4">
            <AvatarImage alt={section.title} src={section.avatar.src} />
            <AvatarFallback className="text-[10px]">
              {section.avatar.fallback}
            </AvatarFallback>
          </Avatar>
        )}
        {section.icon && <section.icon className="size-4 opacity-80" />}
        <span>{section.title}</span>
      </div>
      {section.children && (
        <div className="flex flex-col gap-0.5 ps-6">
          {section.children.map((item) => (
            <Link
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
              data-active={pathname === item.url}
              href={item.url}
              key={item.url}
              onNavigate={onNavigate}
            >
              {item.title}
              {item.external && (
                <ExternalLinkIcon className="size-3 opacity-80" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
