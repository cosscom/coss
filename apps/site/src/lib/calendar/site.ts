import { SITE_URL } from "../site.ts";

/**
 * URL helpers of the Calendar UI kit's pages (coss.com/calendar's `lib/site.ts`): every path is written in
 * full (`/calendar/docs/theming`), so there is no base path to add any more.
 */

/** Absolute URL for a site-relative path. `canonical("/calendar/docs/theming")`. */
export const abs = (path: string): string => new URL(path, SITE_URL).toString();

/** Compact host and path for labels. */
export const siteLabel = (path: string): string => {
  const url = new URL(abs(path));
  return `${url.host.replace(/^www\./, "")}${url.pathname === "/" ? "" : url.pathname}`;
};

/** The `alternates` block every indexable page carries. */
export const canonical = (path: string): { canonical: string } => ({ canonical: abs(path) });
