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
  RouteIcon,
  SettingsIcon,
  UsersRoundIcon,
  WorkflowIcon,
  type LucideIcon,
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
    isActive: true,
    title: "Event Types",
    url: "#",
  },
  {
    icon: CalendarIcon,
    items: [
      {
        title: "Upcoming",
        url: "#",
      },
      {
        title: "Unconfirmed",
        url: "#",
      },
      {
        title: "Recurring",
        url: "#",
      },
      {
        title: "Past",
        url: "#",
      },
      {
        title: "Canceled",
        url: "#",
      },
    ],
    title: "Bookings",
    url: "#",
  },
  {
    icon: ClockFadingIcon,
    title: "Availability",
    url: "#",
  },
  {
    icon: ContactRoundIcon,
    title: "Members",
    url: "#",
  },
  {
    icon: UsersRoundIcon,
    title: "Teams",
    url: "#",
  },
  {
    icon: Grid2x2Plus,
    items: [
      {
        title: "App Store",
        url: "#",
      },
      {
        title: "Installed Apps",
        url: "#",
      },
    ],
    title: "Apps",
    url: "#",
  },
  {
    icon: RouteIcon,
    title: "Routing",
    url: "#",
  },
  {
    badge: "Cal.ai",
    icon: WorkflowIcon,
    title: "Workflows",
    url: "#",
  },
  {
    icon: ActivityIcon,
    title: "Insights",
    url: "#",
  },
];

export const navFooterItems: NavItem[] = [
  {
    icon: ExternalLinkIcon,
    title: "View public page",
    url: "#",
  },
  {
    icon: CopyIcon,
    title: "Copy public page link",
    url: "#",
  },
  {
    icon: GiftIcon,
    title: "Refer and earn",
    url: "#",
  },
  {
    icon: SettingsIcon,
    title: "Settings",
    url: "#",
  },
];

export const user: User = {
  avatar: "",
  email: "pasqua@example.com",
  name: "Pasquale",
};
