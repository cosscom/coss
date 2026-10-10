export const SITE_NAME = "COSS";
export const SITE_URL = "https://coss.com";
export const SITE_DESCRIPTION =
  "One API key and one SDK for email, and soon SMS, video, scheduling and more.";
export const DOCS_ROUTE = "/docs";
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
