import { type LucideIcon, UserIcon } from "lucide-react";

export interface SettingsNavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  children?: {
    title: string;
    url: string;
  }[];
}

export const settingsNavItems: SettingsNavItem[] = [
  {
    children: [
      {
        title: "Profile",
        url: "/settings/my-account/profile",
      },
      {
        title: "General",
        url: "/settings/my-account/general",
      },
      {
        title: "Calendars",
        url: "/settings/my-account/calendars",
      },
      {
        title: "Conferencing",
        url: "/settings/my-account/conferencing",
      },
      {
        title: "Appearance",
        url: "/settings/my-account/appearance",
      },
      {
        title: "Out of Office",
        url: "/settings/my-account/out-of-office",
      },
    ],
    icon: UserIcon,
    title: "My Account",
    url: "/settings/my-account",
  },
];
