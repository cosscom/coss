"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
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
} from "@coss/ui/components/drawer";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { useMediaQuery } from "@coss/ui/hooks/use-media-query";
import {
  GaugeIcon,
  LogOutIcon,
  MessageCircleQuestionMarkIcon,
  MilestoneIcon,
  MonitorDownIcon,
  MoonStarIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

interface UserMenuProps {
  variant?: "sidebar" | "mobile";
}

const triggerButtonClassName = "relative shrink-0 justify-center p-0 lg:size-8";

function UserMenuTriggerContent(): React.ReactElement {
  return (
    <>
      <Avatar className="lg:size-6">
        <AvatarImage
          alt="Luke Tracy"
          src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
        />
        <AvatarFallback>LT</AvatarFallback>
      </Avatar>
      <span className="absolute right-[3px] bottom-[3px] size-2.5 rounded-full border-2 border-sidebar bg-emerald-500 lg:right-0.5 lg:bottom-0.5" />
      <span className="sr-only">User menu</span>
    </>
  );
}

export function UserMenu({
  variant = "sidebar",
}: UserMenuProps): React.ReactElement {
  const isBetweenMdAndLg = useMediaQuery("md:max-lg");

  return (
    <>
      <div className="max-md:hidden">
        <Menu>
          <MenuTrigger
            render={<SidebarMenuButton className={triggerButtonClassName} />}
          >
            <UserMenuTriggerContent />
          </MenuTrigger>
          <MenuPopup
            align={variant === "mobile" ? "end" : "start"}
            alignOffset={
              variant === "sidebar" && isBetweenMdAndLg ? -3 : undefined
            }
            side={
              variant === "mobile"
                ? "bottom"
                : isBetweenMdAndLg
                  ? "right"
                  : "bottom"
            }
          >
            <MenuGroup>
              <MenuGroupLabel>Luke Tracy</MenuGroupLabel>
              <MenuItem>
                <UserRoundIcon />
                My profile
              </MenuItem>
              <MenuItem render={<Link href="/settings/my-account/general" />}>
                <SettingsIcon />
                My settings
              </MenuItem>
              <MenuItem>
                <MoonStarIcon />
                Out of office
              </MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <MenuItem>
                <MilestoneIcon />
                Roadmap
              </MenuItem>
              <MenuItem>
                <MessageCircleQuestionMarkIcon />
                Help
              </MenuItem>
              <MenuItem>
                <MonitorDownIcon />
                Download desktop app
              </MenuItem>
              <MenuItem>
                <GaugeIcon />
                Platform
              </MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem>
              <LogOutIcon />
              Sign out
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>

      <div className="md:hidden">
        <Drawer>
          <DrawerTrigger
            render={<SidebarMenuButton className={triggerButtonClassName} />}
          >
            <UserMenuTriggerContent />
          </DrawerTrigger>
          <DrawerPopup showBar>
            <DrawerPanel>
              <DrawerMenu>
                <DrawerMenuGroup>
                  <DrawerMenuGroupLabel>Luke Tracy</DrawerMenuGroupLabel>
                  <DrawerClose render={<DrawerMenuItem />}>
                    <UserRoundIcon aria-hidden />
                    My profile
                  </DrawerClose>
                  <DrawerClose
                    nativeButton={false}
                    render={
                      <DrawerMenuItem
                        render={<Link href="/settings/my-account/general" />}
                      />
                    }
                  >
                    <SettingsIcon aria-hidden />
                    My settings
                  </DrawerClose>
                  <DrawerClose render={<DrawerMenuItem />}>
                    <MoonStarIcon aria-hidden />
                    Out of office
                  </DrawerClose>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerMenuGroup>
                  <DrawerClose render={<DrawerMenuItem />}>
                    <MilestoneIcon aria-hidden />
                    Roadmap
                  </DrawerClose>
                  <DrawerClose render={<DrawerMenuItem />}>
                    <MessageCircleQuestionMarkIcon aria-hidden />
                    Help
                  </DrawerClose>
                  <DrawerClose render={<DrawerMenuItem />}>
                    <MonitorDownIcon aria-hidden />
                    Download desktop app
                  </DrawerClose>
                  <DrawerClose render={<DrawerMenuItem />}>
                    <GaugeIcon aria-hidden />
                    Platform
                  </DrawerClose>
                </DrawerMenuGroup>
                <DrawerMenuSeparator />
                <DrawerClose render={<DrawerMenuItem />}>
                  <LogOutIcon aria-hidden />
                  Sign out
                </DrawerClose>
              </DrawerMenu>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      </div>
    </>
  );
}
