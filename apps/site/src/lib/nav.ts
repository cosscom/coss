import {
  ApiIcon,
  BookOpen02Icon,
  Calendar03Icon,
  CalendarCheckIn01Icon,
  CommandLineIcon,
  DashboardSquare01Icon,
  File01Icon,
  GitBranchIcon,
  Globe02Icon,
  LicenseIcon,
  Mail01Icon,
  McpServerIcon,
  Message01Icon,
  Robot01Icon,
  RocketIcon,
  Shield01Icon,
  ShipIcon,
  SourceCodeIcon,
  TextIcon,
  UnavailableIcon,
  Video01Icon,
  WebhookIcon,
  WorkHistoryIcon,
} from "@hugeicons/core-free-icons";
import { CALENDAR } from "./calendar";
import { SHIPYARD } from "./shipyard";
import { DOCS_ROUTE, PRODUCTS } from "./site";

/*
 * The header's menus. Every product COSS ships is one entry here: the desktop mega menu
 * and the mobile drawer both render these lists, so a new product needs nothing else in the header.
 */

/** The element the mega menu's panels hang from: the page's sheet, flush under the header. */
export const HEADER_BAR_ID = "site-header-bar";
/**
 * The shell the panels render into (not `<body>`): inside its stacking context, so the shell's
 * rails and corner marks stay drawn over an open panel.
 */
export const SITE_SHELL_ID = "site-shell";

type Icon = typeof Mail01Icon;

export interface MenuLink {
  label: string;
  description: string;
  icon: Icon;
  href: string;
  badge?: "New";
  /** Served by another app of coss.com (a plain link rather than `next/link`). */
  zone?: boolean;
}

export interface MenuColumn {
  title: string;
  links: readonly MenuLink[];
}

/** An API product of `coss`, named from `PRODUCTS`. */
function api(key: (typeof PRODUCTS)[number]["key"], link: Omit<MenuLink, "label">): MenuLink {
  return { ...link, label: PRODUCTS.find((p) => p.key === key)?.name ?? key };
}

export const PRODUCT_COLUMNS: readonly MenuColumn[] = [
  {
    title: "Communication",
    links: [
      api("email", {
        description: "Transactional email from your own domains.",
        icon: Mail01Icon,
        href: "/#email",
      }),
      api("sms", { description: "Text messages worldwide.", icon: Message01Icon, href: "/#sms" }),
      api("video", { description: "Rooms and recordings.", icon: Video01Icon, href: "/#video" }),
    ],
  },
  {
    title: "Scheduling",
    links: [
      api("scheduling", {
        description: "Availability and bookings.",
        icon: CalendarCheckIn01Icon,
        href: "/#scheduling",
      }),
      {
        label: CALENDAR.name,
        description: "A React calendar component.",
        icon: Calendar03Icon,
        href: CALENDAR.path,
        badge: "New",
      },
    ],
  },
  {
    title: "Developer tools",
    links: [
      {
        label: "coss.com ui",
        description: "React components built on Base UI.",
        icon: DashboardSquare01Icon,
        href: "/ui",
        zone: true,
      },
      {
        label: SHIPYARD.name,
        description: "Coding agents on your own dev boxes.",
        icon: ShipIcon,
        href: SHIPYARD.path,
        badge: "New",
      },
    ],
  },
  {
    title: "Platform",
    links: [
      {
        label: "Webhooks",
        description: "Signed events, retried.",
        icon: WebhookIcon,
        href: `${DOCS_ROUTE}/webhooks`,
      },
      {
        label: "Logs and drains",
        description: "Every request and event.",
        icon: WorkHistoryIcon,
        href: `${DOCS_ROUTE}/logs`,
      },
      {
        label: "Domains",
        description: "Verified sending domains.",
        icon: Globe02Icon,
        href: `${DOCS_ROUTE}/email/domains`,
      },
      {
        label: "Suppressions",
        description: "Bounces and opt-outs.",
        icon: UnavailableIcon,
        href: `${DOCS_ROUTE}/email/suppressions`,
      },
      {
        label: "Audit log",
        description: "Who changed what.",
        icon: Shield01Icon,
        href: `${DOCS_ROUTE}/audit-log`,
      },
    ],
  },
];

export const DEVELOPER_COLUMNS: readonly MenuColumn[] = [
  {
    title: "Get started",
    links: [
      {
        label: "Quickstart",
        description: "Send your first email.",
        icon: RocketIcon,
        href: `${DOCS_ROUTE}/quickstart`,
      },
      {
        label: "Documentation",
        description: "Guides for every product.",
        icon: BookOpen02Icon,
        href: DOCS_ROUTE,
      },
      {
        label: "TypeScript SDK",
        description: "Install and configure the client.",
        icon: SourceCodeIcon,
        href: `${DOCS_ROUTE}/sdk`,
      },
      {
        label: "API reference",
        description: "Every endpoint, with examples.",
        icon: ApiIcon,
        href: `${DOCS_ROUTE}/api-reference`,
      },
    ],
  },
  {
    title: "Reference",
    links: [
      {
        label: "Errors",
        description: "Types, codes and retries.",
        icon: LicenseIcon,
        href: `${DOCS_ROUTE}/api-reference/errors`,
      },
      {
        label: "Versioning",
        description: "Dated API versions.",
        icon: GitBranchIcon,
        href: `${DOCS_ROUTE}/api-reference/versioning`,
      },
      {
        label: "Changelog",
        description: "What changed, by version.",
        icon: File01Icon,
        href: `${DOCS_ROUTE}/api-reference/changelog`,
      },
    ],
  },
  {
    title: "For agents",
    links: [
      {
        label: "Agent setup",
        description: "One prompt that sets COSS up.",
        icon: Robot01Icon,
        href: "/#agents",
      },
      {
        label: "MCP server",
        description: "Let your coding agent check delivery.",
        icon: McpServerIcon,
        href: `${DOCS_ROUTE}/mcp`,
      },
      {
        label: "llms.txt",
        description: "Every docs page, indexed.",
        icon: TextIcon,
        href: "/llms.txt",
      },
      {
        label: "llms-full.txt",
        description: "The whole manual in one file.",
        icon: CommandLineIcon,
        href: "/llms-full.txt",
      },
    ],
  },
];
