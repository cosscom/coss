import { initBrowserMonitoring } from "@coss/observability/browser";
import * as Sentry from "@sentry/nextjs";

// Configured at runtime by the dashboard's /api/monitoring (the image is built once for every stage).
void initBrowserMonitoring(Sentry, "web");

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
