"use client";

import {
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react";
import { useIsMobile } from "@/registry/default/hooks/use-mobile";
import { Button } from "@/registry/default/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger,
} from "@/registry/default/ui/drawer";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/registry/default/ui/menu";
import { Separator } from "@/registry/default/ui/separator";

const TRIGGER_ARIA_LABEL = "Open menu";
const _MENU_TITLE = "Actions";

const menuItems = [
  { destructive: false, icon: PencilIcon, label: "Edit" },
  { destructive: false, icon: CopyIcon, label: "Duplicate" },
  { destructive: false, icon: ShareIcon, label: "Share" },
  { destructive: true, icon: TrashIcon, label: "Delete" },
] as const;

export default function Particle() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer position="bottom">
        <DrawerTrigger
          render={
            <Button
              aria-label={TRIGGER_ARIA_LABEL}
              size="icon"
              variant="outline"
            />
          }
        >
          <EllipsisIcon aria-hidden />
        </DrawerTrigger>
        <DrawerPopup showBar>
          <DrawerPanel scrollable={false}>
            <nav className="flex flex-col gap-1">
              {menuItems
                .filter((item) => !item.destructive)
                .map(({ label, icon: Icon }) => (
                  <DrawerClose
                    key={label}
                    render={
                      <Button className="justify-start" variant="ghost">
                        <Icon aria-hidden />
                        {label}
                      </Button>
                    }
                  />
                ))}
              <Separator />
              {menuItems
                .filter((item) => item.destructive)
                .map(({ label, icon: Icon }) => (
                  <DrawerClose
                    key={label}
                    render={
                      <Button
                        className="justify-start text-destructive"
                        variant="ghost"
                      >
                        <Icon aria-hidden />
                        {label}
                      </Button>
                    }
                  />
                ))}
            </nav>
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label={TRIGGER_ARIA_LABEL}
            size="icon"
            variant="outline"
          />
        }
      >
        <EllipsisIcon aria-hidden />
      </MenuTrigger>
      <MenuPopup>
        {menuItems
          .filter((item) => !item.destructive)
          .map(({ label, icon: Icon }) => (
            <MenuItem key={label}>
              <Icon aria-hidden />
              {label}
            </MenuItem>
          ))}
        <MenuSeparator />
        {menuItems
          .filter((item) => item.destructive)
          .map(({ label, icon: Icon }) => (
            <MenuItem key={label} variant="destructive">
              <Icon aria-hidden />
              {label}
            </MenuItem>
          ))}
      </MenuPopup>
    </Menu>
  );
}
