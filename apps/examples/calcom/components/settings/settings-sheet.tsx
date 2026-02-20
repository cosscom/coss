"use client";

import { Sheet, SheetPopup, SheetTrigger } from "@coss/ui/components/sheet";
import { MenuIcon } from "lucide-react";
import * as React from "react";
import { SettingsNavContent } from "@/components/settings/settings-nav-section";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function SettingsSheet() {
  const [open, setOpen] = React.useState(false);

  const handleCloseSheet = React.useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SidebarMenuButton render={<SheetTrigger />} tooltip="Menu">
        <MenuIcon />
      </SidebarMenuButton>
      <SheetPopup className="max-w-sm" showCloseButton={false} side="left">
        <div className="overflow-auto px-2 pt-4">
          <SettingsNavContent onItemClick={handleCloseSheet} />
        </div>
      </SheetPopup>
    </Sheet>
  );
}
