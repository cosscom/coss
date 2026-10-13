import { startBrowserMonitoring } from "@coss/observability/browser";

// Browser errors only (the site's server renders static pages and reports nothing). Configured at
// runtime by the dashboard's /api/monitoring, which shares coss.com with the site (in `next dev`,
// next.config.ts proxies it to the dashboard's port). The SDK is loaded only once that says
// monitoring is on, so no page waits for it.
export const onRouterTransitionStart = startBrowserMonitoring(
  () => import("./lib/monitoring-browser"),
  "site",
);
