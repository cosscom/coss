export const SITE_NAME = "COSS";
export const SITE_URL = "https://coss.com";
export const SITE_DESCRIPTION =
  "One API key and one SDK for email, and soon SMS, video, scheduling and more.";
export const DOCS_ROUTE = "/docs";
/** Shiki themes of every code block (source.config.ts and the Shipyard docs' collection). */
export const CODE_THEMES = { light: "github-light", dark: "github-dark" } as const;
/** The repository, linked from the header with its stars (like coss.com/ui's). */
export const GITHUB_REPO = "cosscom/coss";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

export interface NavItem {
  href: string;
  label: string;
  /** Another site: a plain link in a new tab. */
  external?: boolean;
}

/**
 * The header's "Products" menu: coss.com's products. `zone`: served by another app of coss.com
 * (the coss ui repository's), so a plain link rather than `next/link`.
 */
export const PRODUCT_MENU: readonly {
  label: string;
  href: string;
  badge?: string;
  zone?: boolean;
}[] = [
  { label: "coss.com sdk", href: DOCS_ROUTE },
  { label: "coss.com ui", href: "/ui", zone: true },
  { label: "shipyard", href: "/shipyard", badge: "New" },
  { label: "kloq", href: "/kloq", badge: "New" },
];

/** The header's sections (also the first group of the command menu and the mobile menu). */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: DOCS_ROUTE, label: "Docs" },
  { href: `${DOCS_ROUTE}/api-reference`, label: "API Reference" },
  { href: "/pricing", label: "Pricing" },
];
/** Where Enterprise inquiries go (the pricing page and the billing guide). */
export const SALES_EMAIL = "sales@coss.com";

/** COSS's products, and whether each can be used yet (the landing and pricing pages). */
export const PRODUCTS = [
  {
    key: "email",
    name: "Email",
    description: "Transactional email from your own domains.",
    available: true,
  },
  { key: "sms", name: "SMS", description: "Text messages worldwide.", available: false },
  { key: "video", name: "Video", description: "Rooms and recordings.", available: false },
  {
    key: "scheduling",
    name: "Scheduling",
    description: "Bookings and availability.",
    available: false,
  },
] as const;
/** The docs' search endpoint. Under /docs: on coss.com, `/api/*` belongs to the dashboard. */
export const SEARCH_API = `${DOCS_ROUTE}/search.json`;

/**
 * The dashboard (apps/web) shares coss.com with this site, so its pages and Better Auth
 * (`/api/auth/*`) are same-origin. In `next dev` it runs on its own port: links point there, and
 * next.config.ts proxies `/api/auth/*` to it (localhost cookies are shared across ports).
 */
export const DEV_DASHBOARD_ORIGIN = "http://localhost:3000";

/** The public API in `next dev` (`bun run dev`): the reference's samples and playground target it first. */
export const DEV_API_ORIGIN = "http://localhost:3001";

/** A dashboard page. Link with `<a>`, not `next/link`: it is another app (zone). */
export function dashboardUrl(path: string): string {
  return process.env.NODE_ENV === "development" ? `${DEV_DASHBOARD_ORIGIN}${path}` : path;
}
