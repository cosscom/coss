"use client";

import "./global.css";
import { Button } from "@coss/ui/components/button";
import { useEffect } from "react";

/** Replaces the root layout when it throws while rendering; reports the error to Sentry. */
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
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center font-sans text-foreground antialiased">
        <title>Something went wrong · coss.com</title>
        <h1 className="font-semibold text-2xl">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          An unexpected error occurred. Try again, or come back in a few minutes.
        </p>
        <Button onClick={() => retry()} variant="outline">
          Try again
        </Button>
      </body>
    </html>
  );
}
