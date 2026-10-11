import { initBrowserMonitoring } from "@coss/observability/browser";
import * as Sentry from "@sentry/nextjs";

// Browser errors only (the site's server renders static pages and reports nothing). Configured at
// runtime by the dashboard's /api/monitoring, which shares coss.com with the site (in `next dev`,
// next.config.ts proxies it to the dashboard's port).
void initBrowserMonitoring(Sentry, "site");

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
