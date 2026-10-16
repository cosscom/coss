"use client";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatElapsed } from "@/lib/format";

/**
 * Re-renders the page's server components every `seconds` while it is visible, and at once when
 * it becomes visible again after being hidden that long. With `renderedAt` (when the server
 * rendered the page, so it changes with every refresh) it also says how fresh the page is, with a
 * button to refresh now.
 */
export function AutoRefresh(props: { seconds: number; renderedAt?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  /** When this tab last got a fresh render (any refresh, a server action's included). */
  const updatedAt = useRef(Date.now());
  // `null` until mounted: the server and the browser would disagree on the age.
  const [now, setNow] = useState<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new render is a fresh page.
  useEffect(() => {
    updatedAt.current = Date.now();
    setNow(Date.now());
  }, [props.renderedAt]);

  const refresh = () => {
    updatedAt.current = Date.now();
    startTransition(() => router.refresh());
  };
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const interval = props.seconds * 1000;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshRef.current();
    }, interval);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - updatedAt.current >= interval) {
        refreshRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [props.seconds]);

  const showStatus = props.renderedAt !== undefined;
  useEffect(() => {
    if (!showStatus) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [showStatus]);

  if (!showStatus) return null;
  const age = now === null ? 0 : now - updatedAt.current;
  return (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums"
      title={`Refreshes every ${props.seconds} seconds while this tab is open`}
    >
      {pending
        ? "Updating…"
        : age < 5000
          ? "Updated just now"
          : `Updated ${formatElapsed(age)} ago`}
      <Button aria-label="Refresh now" onClick={refresh} size="icon-xs" variant="ghost">
        <RefreshCwIcon className={cn(pending && "motion-safe:animate-spin")} />
      </Button>
    </span>
  );
}
