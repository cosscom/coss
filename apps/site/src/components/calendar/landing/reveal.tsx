import { cn } from "@coss/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/** Rises in as it scrolls into view. CSS only: visible wherever scroll timelines or motion are unavailable. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      style={delay ? ({ "--reveal-offset": `${delay / 2}px` } as CSSProperties) : undefined}
      className={cn("landing-reveal", className)}
    >
      {children}
    </div>
  );
}
