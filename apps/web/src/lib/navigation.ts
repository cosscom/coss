import {
  BanIcon,
  BookmarkIcon,
  BotIcon,
  BoxesIcon,
  BuildingIcon,
  CableIcon,
  ContactRoundIcon,
  CreditCardIcon,
  DatabaseIcon,
  FilePenLineIcon,
  FilterIcon,
  FoldersIcon,
  GaugeIcon,
  GlobeIcon,
  HistoryIcon,
  ImportIcon,
  InboxIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  ListChecksIcon,
  ListFilterIcon,
  type LucideIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  MessageSquareReplyIcon,
  MessageSquareXIcon,
  MonitorSmartphoneIcon,
  MousePointerClickIcon,
  NetworkIcon,
  PanelsTopLeftIcon,
  PenLineIcon,
  RocketIcon,
  ScaleIcon,
  ScanSearchIcon,
  ScrollTextIcon,
  SendIcon,
  SettingsIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SignatureIcon,
  SlidersHorizontalIcon,
  TagsIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
  WebhookIcon,
} from "lucide-react";

/**
 * The dashboard's navigation: one list that the sidebar, the breadcrumbs and the ⌘K menu all read.
 * Hrefs are relative to their area's base path (`/acme`, `/acme/projects/web/production`, …).
 */
export type NavItem = {
  label: string;
  /** Relative to the area's base path; `""` is the base itself. */
  path: string;
  icon: LucideIcon;
  /** Active only on the exact path (overview pages), not on its children. */
  exact?: boolean;
};

export type NavGroup = { label?: string; items: NavItem[] };

/** An environment's pages, grouped by product. */
export const ENVIRONMENT_NAV: NavGroup[] = [
  { items: [{ label: "Overview", path: "", icon: LayoutDashboardIcon, exact: true }] },
  {
    label: "Email",
    items: [
      { label: "Emails", path: "/emails", icon: MailIcon },
      { label: "Templates", path: "/templates", icon: LayoutTemplateIcon },
      { label: "Received", path: "/received", icon: InboxIcon },
      { label: "Inboxes", path: "/inboxes", icon: BotIcon },
      { label: "Suppressions", path: "/suppressions", icon: BanIcon },
      { label: "Tracking", path: "/tracking", icon: MousePointerClickIcon },
      { label: "Content storage", path: "/content-storage", icon: DatabaseIcon },
    ],
  },
  {
    label: "SMS",
    items: [
      { label: "Messages", path: "/sms", icon: MessageSquareIcon },
      { label: "Received", path: "/sms/received", icon: MessageSquareReplyIcon },
      { label: "Suppressions", path: "/sms/suppressions", icon: MessageSquareXIcon },
    ],
  },
  {
    label: "Sign",
    items: [
      { label: "Requests", path: "/sign", icon: SignatureIcon },
      { label: "Templates", path: "/sign/templates", icon: FilePenLineIcon },
      { label: "Settings", path: "/sign/settings", icon: PenLineIcon },
    ],
  },
  {
    label: "Verify",
    items: [
      { label: "Verifications", path: "/verify", icon: ShieldCheckIcon },
      { label: "Settings", path: "/verify/settings", icon: SlidersHorizontalIcon },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Broadcasts", path: "/broadcasts", icon: SendIcon },
      { label: "Contacts", path: "/contacts", icon: ContactRoundIcon },
      { label: "Audiences", path: "/audiences", icon: UsersRoundIcon },
      { label: "Segments", path: "/segments", icon: FilterIcon },
      { label: "Topics", path: "/topics", icon: BookmarkIcon },
      { label: "Settings", path: "/marketing", icon: MegaphoneIcon },
    ],
  },
  {
    label: "Risk",
    items: [
      { label: "Assessments", path: "/risk", icon: ShieldAlertIcon },
      { label: "Rules", path: "/risk/rules", icon: ListFilterIcon },
      { label: "Lists", path: "/risk/lists", icon: ListChecksIcon },
      { label: "Rate limits", path: "/risk/limits", icon: GaugeIcon },
      { label: "Calibration", path: "/risk/calibration", icon: ScaleIcon },
      { label: "Settings", path: "/risk/settings", icon: SlidersHorizontalIcon },
    ],
  },
  {
    label: "Hooks",
    items: [
      { label: "Applications", path: "/hooks", icon: BoxesIcon },
      { label: "Event types", path: "/hooks/event-types", icon: TagsIcon },
      { label: "Portal settings", path: "/hooks/settings", icon: PanelsTopLeftIcon },
    ],
  },
  {
    label: "Developers",
    items: [
      { label: "API keys", path: "/api-keys", icon: KeyRoundIcon },
      { label: "Webhooks", path: "/webhooks", icon: WebhookIcon },
      { label: "Logs", path: "/logs", icon: ScrollTextIcon },
      { label: "Log drains", path: "/log-drains", icon: CableIcon },
      { label: "Import", path: "/import", icon: ImportIcon },
    ],
  },
];

/** An organization's pages. */
export const ORGANIZATION_NAV: NavItem[] = [
  { label: "Projects", path: "", icon: FoldersIcon, exact: true },
  { label: "Domains", path: "/domains", icon: GlobeIcon },
  { label: "Dedicated IPs", path: "/dedicated-ips", icon: NetworkIcon },
  { label: "SMS", path: "/sms", icon: MessageSquareIcon },
  { label: "Members", path: "/members", icon: UsersIcon },
  { label: "Reputation", path: "/reputation", icon: GaugeIcon },
  { label: "Spend", path: "/spend", icon: WalletIcon },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
];

/** The tabs of an organization's spend (under `/acme/spend`). */
export const SPEND_NAV: NavItem[] = [
  { label: "Overview", path: "", icon: WalletIcon, exact: true },
  { label: "Budgets", path: "/budgets", icon: GaugeIcon },
];

/** The tabs of an organization's settings (under `/acme/settings`). */
export const ORGANIZATION_SETTINGS_NAV: NavItem[] = [
  { label: "General", path: "", icon: SettingsIcon, exact: true },
  { label: "Billing", path: "/billing", icon: CreditCardIcon },
  { label: "Single sign-on", path: "/sso", icon: ShieldIcon },
  { label: "Directory sync", path: "/scim", icon: UsersIcon },
  { label: "Audit log", path: "/audit", icon: HistoryIcon },
];

/** The tabs of a domain (under `/acme/domains/dom_…`). */
export const DOMAIN_NAV: NavItem[] = [
  { label: "Overview", path: "", icon: GlobeIcon, exact: true },
  { label: "DMARC", path: "/dmarc", icon: ShieldIcon },
];

/** Account settings (under `/settings`). */
export const ACCOUNT_NAV: NavItem[] = [
  { label: "Profile", path: "", icon: UserIcon, exact: true },
  { label: "Security", path: "/security", icon: ShieldIcon },
  { label: "Sessions", path: "/sessions", icon: MonitorSmartphoneIcon },
];

/** The platform admin console (under `/admin`). */
export const ADMIN_NAV: NavItem[] = [
  { label: "Overview", path: "", icon: LayoutDashboardIcon, exact: true },
  { label: "Users", path: "/users", icon: UserIcon },
  { label: "Organizations", path: "/organizations", icon: BuildingIcon },
  { label: "Sign-ups", path: "/signups", icon: UserPlusIcon },
  { label: "Sending", path: "/sending", icon: SendIcon },
  { label: "Emails", path: "/emails", icon: MailIcon },
  { label: "SMS", path: "/sms", icon: MessageSquareIcon },
  { label: "Screening", path: "/screening", icon: ScanSearchIcon },
  { label: "Audit log", path: "/audit", icon: HistoryIcon },
  { label: "Reputation", path: "/reputation", icon: GaugeIcon },
  { label: "Billing", path: "/billing", icon: CreditCardIcon },
  { label: "Deploys", path: "/deploys", icon: RocketIcon },
];

/**
 * The current page among `items` (under `base`): the one whose href is the longest prefix of
 * `pathname`, so `/risk/lists` picks "Lists" and `/risk/rsk_…` picks "Assessments".
 */
export function activeNavItem(
  pathname: string,
  base: string,
  items: NavItem[],
): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of items) {
    const href = base + item.path;
    const matches = pathname === href || (!item.exact && pathname.startsWith(`${href}/`));
    if (matches && (!best || item.path.length > best.path.length)) best = item;
  }
  return best;
}

/** The environment base path of a project's environment. */
export function environmentPath(orgSlug: string, projectSlug: string, envSlug: string): string {
  return `/${orgSlug}/projects/${projectSlug}/${envSlug}`;
}

/** Every item of a set of groups, flattened. */
export function navItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items);
}

/**
 * The label of a static path segment in breadcrumbs (`api-keys` → "API keys"). Dynamic segments
 * (ids, slugs) have none and are named by the caller.
 */
export function segmentLabel(segment: string): string | undefined {
  return SEGMENT_LABELS[segment];
}

const SEGMENT_LABELS: Record<string, string> = {
  emails: "Emails",
  sms: "SMS",
  sign: "Sign",
  verify: "Verify",
  register: "Register",
  templates: "Templates",
  versions: "Versions",
  hooks: "Hooks",
  "event-types": "Event types",
  endpoints: "Endpoints",
  messages: "Messages",
  received: "Received",
  inboxes: "Inboxes",
  suppressions: "Suppressions",
  broadcasts: "Broadcasts",
  contacts: "Contacts",
  properties: "Properties",
  audiences: "Audiences",
  segments: "Segments",
  new: "New",
  topics: "Topics",
  marketing: "Marketing settings",
  tracking: "Tracking",
  "content-storage": "Content storage",
  risk: "Risk",
  lists: "Lists",
  rules: "Rules",
  limits: "Rate limits",
  calibration: "Calibration",
  "api-keys": "API keys",
  webhooks: "Webhooks",
  logs: "Logs",
  "log-drains": "Log drains",
  import: "Import",
  domains: "Domains",
  dmarc: "DMARC",
  "dedicated-ips": "Dedicated IPs",
  members: "Members",
  reputation: "Reputation",
  spend: "Spend",
  budgets: "Budgets",
  settings: "Settings",
  billing: "Billing",
  plans: "Plans",
  invoices: "Invoices",
  sso: "Single sign-on",
  scim: "Directory sync",
  audit: "Audit log",
  security: "Security",
  sessions: "Sessions",
  users: "Users",
  organizations: "Organizations",
  signups: "Sign-ups",
  sending: "Sending",
  screening: "Screening",
  deploys: "Deploys",
};
