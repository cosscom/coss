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
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger,
} from "@/registry/default/ui/drawer";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/registry/default/ui/menu";

const TRIGGER_ARIA_LABEL = "Open menu";

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
            <DrawerMenu>
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Actions</DrawerMenuGroupLabel>
                <DrawerClose render={<DrawerMenuItem />}>
                  <PencilIcon aria-hidden />
                  Edit
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <CopyIcon aria-hidden />
                  Duplicate
                </DrawerClose>
                <DrawerClose render={<DrawerMenuItem />}>
                  <ShareIcon aria-hidden />
                  Share
                </DrawerClose>
              </DrawerMenuGroup>
              <DrawerMenuSeparator />
              <DrawerMenuGroup>
                <DrawerMenuGroupLabel>Danger zone</DrawerMenuGroupLabel>
                <DrawerClose render={<DrawerMenuItem variant="destructive" />}>
                  <TrashIcon aria-hidden />
                  Delete
                </DrawerClose>
              </DrawerMenuGroup>
            </DrawerMenu>
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
        <MenuGroup>
          <MenuGroupLabel>Actions</MenuGroupLabel>
          <MenuItem>
            <PencilIcon aria-hidden />
            Edit
          </MenuItem>
          <MenuItem>
            <CopyIcon aria-hidden />
            Duplicate
          </MenuItem>
          <MenuItem>
            <ShareIcon aria-hidden />
            Share
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Danger zone</MenuGroupLabel>
          <MenuItem variant="destructive">
            <TrashIcon aria-hidden />
            Delete
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
