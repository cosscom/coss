"use client";

import { Sheet, SheetPopup, SheetTrigger } from "@coss/ui/components/sheet";
import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";
import { SettingsNavSection } from "@/components/settings/settings-nav-section";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { settingsNavItems } from "@/lib/settings-navigation-data";

export function SettingsSheet() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const handleCloseSheet = React.useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SidebarMenuButton render={<SheetTrigger />} tooltip="Menu">
        <MenuIcon />
      </SidebarMenuButton>
      <SheetPopup className="max-w-sm" showCloseButton={false} side="left">
        <div className="flex flex-col gap-6 overflow-auto p-6 pt-8">
          {settingsNavItems.map((section) => (
            <SettingsNavSection
              key={section.url}
              onItemClick={handleCloseSheet}
              pathname={pathname}
              section={section}
              variant="sheet"
            />
          ))}
        </div>
      </SheetPopup>
    </Sheet>
  );
}
