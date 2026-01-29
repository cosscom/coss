import {
  ActivityIcon,
  CalendarIcon,
  ClockFadingIcon,
  ContactRoundIcon,
  CopyIcon,
  ExternalLinkIcon,
  GiftIcon,
  Grid2x2Plus,
  Link2Icon,
  type LucideIcon,
  RouteIcon,
  SettingsIcon,
  UsersRoundIcon,
  WorkflowIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  badge?: string;
  items?: {
    title: string;
    url: string;
  }[];
}

export interface User {
  avatar: string;
  email: string;
  name: string;
}

export const navMainItems: NavItem[] = [
  {
    icon: Link2Icon,
    title: "Event Types",
    url: "/event-types",
  },
  {
    icon: CalendarIcon,
    title: "Bookings",
    url: "/booking/upcoming",
  },
  {
    icon: ClockFadingIcon,
    title: "Availability",
    url: "/availability",
  },
  {
    icon: ContactRoundIcon,
    title: "Members",
    url: "/members",
  },
  {
    icon: UsersRoundIcon,
    title: "Teams",
    url: "/teams",
  },
  {
    icon: Grid2x2Plus,
    items: [
      {
        title: "App Store",
        url: "/apps/store",
      },
      {
        title: "Installed Apps",
        url: "/apps/installed",
      },
    ],
    title: "Apps",
    url: "/apps",
  },
  {
    icon: RouteIcon,
    title: "Routing",
    url: "/routing",
  },
  {
    icon: WorkflowIcon,
    title: "Workflows",
    url: "/workflows",
  },
  {
    icon: ActivityIcon,
    title: "Insights",
    url: "/insights",
  },
];

export const navFooterItems: NavItem[] = [
  {
    icon: ExternalLinkIcon,
    title: "View public page",
    url: "/public",
  },
  {
    icon: CopyIcon,
    title: "Copy public page link",
    url: "#",
  },
  {
    icon: GiftIcon,
    title: "Refer and earn",
    url: "/refer",
  },
  {
    icon: SettingsIcon,
    title: "Settings",
    url: "/settings",
  },
];

export const user: User = {
  avatar: "",
  email: "pasqua@example.com",
  name: "Pasquale",
};
