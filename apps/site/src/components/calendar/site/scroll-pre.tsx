"use client";

import { cn } from "@coss/ui/lib/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";

/** A `<pre>` that becomes a labelled, focusable region only while its content actually overflows. */
export function ScrollPre({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <pre
      ref={ref}
      {...(scrolls ? { tabIndex: 0, role: "region", "aria-label": label } : {})}
      className={cn(
        "overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      {children}
    </pre>
  );
}
