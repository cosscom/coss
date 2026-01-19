import {
  CreditCardIcon,
  KeyIcon,
  type LucideIcon,
  TerminalIcon,
} from "lucide-react";

export interface SettingsNavChild {
  title: string;
  url: string;
  external?: boolean;
}

export interface SettingsNavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  avatar?: {
    src: string;
    fallback: string;
  };
  children?: SettingsNavChild[];
}

export const userSettingsItems: SettingsNavItem[] = [
  {
    avatar: {
      fallback: "LT",
      src: "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80",
    },
    children: [
      { title: "Profile", url: "/settings/my-account/profile" },
      { title: "General", url: "/settings/my-account/general" },
      { title: "Calendars", url: "/settings/my-account/calendars" },
      { title: "Conferencing", url: "/settings/my-account/conferencing" },
      { title: "Appearance", url: "/settings/my-account/appearance" },
      { title: "Out of office", url: "/settings/my-account/out-of-office" },
      {
        title: "Push notifications",
        url: "/settings/my-account/push-notifications",
      },
    ],
    title: "Luke Tracy",
    url: "/settings/my-account",
  },
  {
    avatar: {
      fallback: "LT",
      src: "https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg",
    },
    children: [
      { title: "Password", url: "/settings/security/password" },
      { title: "Impersonation", url: "/settings/security/impersonation" },
      {
        title: "Two factor authentication",
        url: "/settings/security/two-factor-auth",
      },
      { title: "Compliance", url: "/settings/security/compliance" },
    ],
    icon: KeyIcon,
    title: "Security",
    url: "/settings/security",
  },
  {
    children: [{ title: "Manage billing", url: "/settings/billing" }],
    icon: CreditCardIcon,
    title: "Billing",
    url: "/settings/billing",
  },
  {
    children: [
      { title: "Webhooks", url: "/settings/developer/webhooks" },
      { title: "API keys", url: "/settings/developer/api-keys" },
    ],
    icon: TerminalIcon,
    title: "Developer",
    url: "/settings/developer",
  },
];

export const orgSettingsItems: SettingsNavItem[] = [
  {
    avatar: {
      fallback: "CC",
      src: "https://pbs.twimg.com/profile_images/1994776674391457792/7utKOMi6_400x400.jpg",
    },
    children: [
      { title: "Profile", url: "/settings/organizations/profile" },
      { title: "General", url: "/settings/organizations/general" },
      {
        title: "Guest notifications",
        url: "/settings/organizations/guest-notifications",
      },
      {
        external: true,
        title: "Members",
        url: "/settings/organizations/members",
      },
      { title: "Attributes", url: "/settings/organizations/attributes" },
      {
        external: true,
        title: "Admin API",
        url: "/settings/organizations/admin-api",
      },
      {
        title: "Delegation credential",
        url: "/settings/organizations/delegation-credential",
      },
      {
        title: "Roles & permissions",
        url: "/settings/organizations/roles-permissions",
      },
    ],
    title: "Cal.com",
    url: "/settings/organizations",
  },
];

export const settingsNavItems: SettingsNavItem[] = [
  ...userSettingsItems,
  ...orgSettingsItems,
];
