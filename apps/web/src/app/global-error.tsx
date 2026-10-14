"use client";

import "@coss/ui/globals.css";
import { Button } from "@coss/ui/components/button";
import { fontMono, fontSans } from "@coss/ui/fonts";
import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";

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
  useEffect(() => {
    // The SDK's own chunk (instrumentation-client.ts); a no-op while monitoring is off.
    void import("../lib/monitoring-browser").then(({ captureException }) =>
      captureException(error),
    );
  }, [error]);

  return (
    // Self-contained: the root layout (and its theme provider) didn't render, so this page stays
    // light and loads the fonts itself.
    <html className={`${fontSans.variable} ${fontMono.variable}`} lang="en">
      <body className="min-h-dvh bg-sidebar font-sans text-foreground antialiased">
        <title>Something went wrong · COSS</title>
        <main className="flex min-h-dvh p-2">
          <div className="flex flex-1 overflow-hidden rounded-2xl border bg-background">
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
          </div>
        </main>
      </body>
    </html>
  );
}
