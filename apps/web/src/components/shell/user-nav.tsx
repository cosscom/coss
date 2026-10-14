"use client";

import { Avatar, AvatarFallback } from "@coss/ui/components/avatar";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@coss/ui/components/sidebar";
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { postAuth } from "@/lib/auth-post";
import { initials } from "./initials";
import { THEME_OPTIONS } from "./theme-options";

export type ShellUser = { name: string; email: string; isAdmin: boolean };

/**
 * The signed-in user at the foot of the sidebar: account settings, the admin console (platform
 * admins), the theme and sign out.
 */
export function UserNav({ user }: { user: ShellUser }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Menu>
          <MenuTrigger
            render={<SidebarMenuButton className="data-popup-open:bg-sidebar-accent" size="lg" />}
          >
            <Avatar className="size-8 rounded-lg border bg-background">
              <AvatarFallback className="rounded-lg bg-transparent">
                {initials(user.name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium text-foreground">
                {user.name || user.email}
              </span>
              <span className="truncate text-muted-foreground text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ms-auto size-4" />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-56" side={isMobile ? "top" : "right"}>
            <MenuGroup>
              <MenuGroupLabel>
                <span className="block max-w-56 truncate font-medium text-foreground">
                  {user.name}
                </span>
                <span className="block max-w-56 truncate font-normal">{user.email}</span>
              </MenuGroupLabel>
              <MenuLinkItem render={<Link href="/settings" />}>
                <SettingsIcon />
                Account settings
              </MenuLinkItem>
              {user.isAdmin ? (
                <MenuLinkItem render={<Link href="/admin" />}>
                  <ShieldIcon />
                  Admin console
                </MenuLinkItem>
              ) : null}
            </MenuGroup>
            <MenuSeparator />
            <MenuGroup>
              <MenuGroupLabel>Theme</MenuGroupLabel>
              <MenuRadioGroup onValueChange={(value) => setTheme(value as string)} value={theme}>
                {THEME_OPTIONS.map((option) => (
                  <MenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem
              onClick={async () => {
                await postAuth("/sign-out");
                router.push("/sign-in");
                router.refresh();
              }}
            >
              <LogOutIcon />
              Sign out
            </MenuItem>
          </MenuPopup>
        </Menu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
