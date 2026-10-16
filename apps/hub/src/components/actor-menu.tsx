"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@coss/ui/components/avatar";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuLinkItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import {
  AccessibilityIcon,
  BookMarkedIcon,
  Building2Icon,
  GlobeIcon,
  HeartIcon,
  LogOutIcon,
  MessageSquareTextIcon,
  PaintbrushIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const COSS = "https://coss.com";

/** GitHub's account menu: who you are, your pages, your settings, sign out. */
export function ActorMenu({
  current,
  onboarded,
}: {
  current: {
    handle: string;
    name: string;
    location?: string;
    avatarUrl: string | null;
    initials: string;
  };
  onboarded: boolean;
}) {
  const router = useRouter();
  const profile = `/${current.handle}`;
  const pages = [
    { label: "Profile", href: profile, icon: UserIcon },
    { label: "Projects", href: `${profile}#pinned`, icon: BookMarkedIcon },
    { label: "Stars", href: `${profile}#pinned`, icon: StarIcon },
    { label: "Prompt requests", href: `${profile}#prompts`, icon: MessageSquareTextIcon },
    { label: "Organizations", href: "/calcom", icon: Building2Icon },
    { label: "Sponsors", href: `${COSS}/pricing`, icon: HeartIcon },
  ];
  const settings = [
    {
      label: onboarded ? "Settings" : "Finish your profile",
      href: "/onboarding",
      icon: SettingsIcon,
    },
    { label: "Appearance", href: `${COSS}/settings`, icon: PaintbrushIcon },
    { label: "Accessibility", href: `${COSS}/settings`, icon: AccessibilityIcon },
  ];
  return (
    <Menu>
      <MenuTrigger
        aria-label="Account"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-8 border">
          {current.avatarUrl && <AvatarImage alt="" src={current.avatarUrl} />}
          <AvatarFallback className="bg-muted">{current.initials}</AvatarFallback>
        </Avatar>
      </MenuTrigger>
      <MenuPopup align="end" className="w-64">
        <MenuGroup>
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="size-9 border">
              {current.avatarUrl && <AvatarImage alt="" src={current.avatarUrl} />}
              <AvatarFallback className="bg-muted">{current.initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-sm">{current.handle}</span>
              <span className="truncate text-muted-foreground text-sm">{current.name}</span>
            </div>
          </div>
          {current.location && (
            <div className="flex items-center gap-2 px-2 pb-2 text-muted-foreground text-sm">
              <GlobeIcon aria-hidden className="size-4" />
              Working from {current.location}
            </div>
          )}
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          {pages.map((item) => (
            <MenuLinkItem href={item.href} key={item.label}>
              <item.icon aria-hidden />
              {item.label}
            </MenuLinkItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          {settings.map((item) => (
            <MenuLinkItem href={item.href} key={item.label}>
              <item.icon aria-hidden />
              {item.label}
            </MenuLinkItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuItem
          onClick={() =>
            authClient
              .signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
              .then(() => router.refresh())
          }
        >
          <LogOutIcon aria-hidden />
          Sign out
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
