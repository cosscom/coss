"use client";

import "@coss/ui/globals.css";
import { Button } from "@coss/ui/components/button";
import { fontMono, fontSans } from "@coss/ui/fonts";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";

/**
 * During a rolling deploy a page rendered by an old task can post its Server Action to a new one,
 * whose action ids differ (they change with every build): Next throws UnrecognizedActionError. A
 * reload fetches the page from the current build. At most one automatic reload per 10 s, so a
 * reload that lands on an old task again (until the load balancer drains it) can't spin.
 */
const SKEW_RELOAD_KEY = "coss:version-skew-reload";
const SKEW_RELOAD_INTERVAL_MS = 10_000;

function reloadForNewDeployment(): boolean {
  try {
    const last = Number(sessionStorage.getItem(SKEW_RELOAD_KEY) ?? 0);
    if (Date.now() - last < SKEW_RELOAD_INTERVAL_MS) return false;
    sessionStorage.setItem(SKEW_RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload once (this render).
  }
  window.location.reload();
  return true;
}

/**
 * Replaces the root layout when it (or anything not under a nested error boundary) throws while
 * rendering. Reports the error to Sentry; server errors arrive with only a `digest`, which their
 * server-side event (onRequestError) carries too.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const versionSkew = unstable_isUnrecognizedActionError(error);
  useEffect(() => {
    // Not a bug: the page predates the running deployment.
    if (versionSkew) {
      reloadForNewDeployment();
      return;
    }
    // The SDK's own chunk (instrumentation-client.ts); a no-op while monitoring is off.
    void import("../lib/monitoring-browser").then(({ captureException }) =>
      captureException(error),
    );
  }, [error, versionSkew]);

  return (
    // Self-contained: the root layout (and its theme provider) didn't render, so this page stays
    // light and loads the fonts itself.
    <html className={`${fontSans.variable} ${fontMono.variable}`} lang="en">
      <body className="min-h-dvh bg-sidebar font-sans text-foreground antialiased">
        <title>{versionSkew ? "Updating · coss.com" : "Something went wrong · coss.com"}</title>
        <main className="flex min-h-dvh p-2">
          <div className="flex flex-1 overflow-hidden rounded-2xl border bg-background">
            {versionSkew ? (
              <EmptyState
                action={
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Reload
                  </Button>
                }
                description="coss.com was just updated. Reload the page, then try again."
                icon={RefreshCwIcon}
                title="A new version is available"
              />
            ) : (
              <EmptyState
                action={
                  <Button onClick={() => retry()} variant="outline">
                    Try again
                  </Button>
                }
                description="An unexpected error occurred. Try again, or come back in a few minutes."
                icon={TriangleAlertIcon}
                title="Something went wrong"
              />
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
