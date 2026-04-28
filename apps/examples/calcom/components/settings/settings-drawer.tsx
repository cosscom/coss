"use client";

import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@coss/ui/components/drawer";
import { MenuIcon } from "lucide-react";
import * as React from "react";
import { SettingsNavContent } from "@/components/settings/settings-nav-section";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function SettingsDrawer(): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  const handleCloseDrawer = React.useCallback((): void => {
    setOpen(false);
  }, []);

  return (
    <Drawer onOpenChange={setOpen} open={open} position="left">
      <SidebarMenuButton render={<DrawerTrigger />} tooltip="Menu">
        <MenuIcon />
      </SidebarMenuButton>
      <DrawerPopup showCloseButton variant="straight">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Settings</DrawerTitle>
        </DrawerHeader>
        <DrawerPanel className="px-2 pt-4!">
          <SettingsNavContent onItemClick={handleCloseDrawer} />
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
