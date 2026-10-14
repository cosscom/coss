import { Button } from "@coss/ui/components/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Keyset pagination for newest-first lists: "Newest" returns to the first page, "Older" follows
 * the next cursor. Links only, so it works without client JavaScript.
 */
export function CursorPager(props: {
  /** Shown on the left: "50 emails", a range… */
  summary?: ReactNode;
  /** The first page (without a cursor), when this isn't it. */
  newestHref?: string;
  /** The next (older) page, when there is one. */
  olderHref?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-muted-foreground text-sm">
      <span>{props.summary}</span>
      <div className="flex gap-2">
        <Button
          disabled={!props.newestHref}
          render={props.newestHref ? <Link href={props.newestHref} /> : undefined}
          size="sm"
          variant="outline"
        >
          <ChevronLeftIcon />
          Newest
        </Button>
        <Button
          disabled={!props.olderHref}
          render={props.olderHref ? <Link href={props.olderHref} /> : undefined}
          size="sm"
          variant="outline"
        >
          Older
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
