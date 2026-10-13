"use client";

import { Button } from "@coss/ui/components/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { ChevronDownIcon, LogOutIcon, SettingsIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postAuth } from "@/lib/auth-post";

/** The signed-in user's menu: account settings, the admin console (platform admins) and sign out. */
export function UserMenu(props: { name: string; email: string; isAdmin: boolean }) {
  const router = useRouter();

  return (
    <Menu>
      <MenuTrigger render={<Button size="sm" variant="ghost" />}>
        <span className="max-w-56 truncate text-muted-foreground">{props.email}</span>
        <ChevronDownIcon />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuGroup>
          <MenuGroupLabel>
            <span className="block max-w-56 truncate font-medium text-foreground">
              {props.name}
            </span>
            <span className="block max-w-56 truncate font-normal">{props.email}</span>
          </MenuGroupLabel>
          <MenuLinkItem render={<Link href="/settings" />}>
            <SettingsIcon />
            Account settings
          </MenuLinkItem>
          {props.isAdmin ? (
            <MenuLinkItem render={<Link href="/admin" />}>
              <ShieldIcon />
              Admin console
            </MenuLinkItem>
          ) : null}
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
  );
}
