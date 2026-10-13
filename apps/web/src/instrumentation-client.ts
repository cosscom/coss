import { startBrowserMonitoring } from "@coss/observability/browser";

// Configured at runtime by the dashboard's /api/monitoring (the image is built once for every stage).
// The SDK is loaded only once that says monitoring is on, so no page waits for it.
export const onRouterTransitionStart = startBrowserMonitoring(
  () => import("./lib/monitoring-browser"),
  "web",
);
