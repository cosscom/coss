"use client";

import "@coss/ui/globals.css";
import { Button } from "@coss/ui/components/button";
import { useEffect } from "react";

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
    <html lang="en">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <title>Something went wrong · COSS</title>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="font-semibold text-2xl">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred. Try again, or come back in a few minutes.
          </p>
          <Button onClick={() => retry()} variant="outline">
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
