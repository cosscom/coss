"use client";
import { cn } from "@coss/ui/lib/utils";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Where a drawing of Shipyard's landing page sits. Once the page has hydrated it holds the
 * drawing's parts back (`data-armed`), then lets them drop in when the drawing scrolls into view
 * (`data-in`); landing.css does the moving. Without script, or with reduced motion, the drawing is
 * simply there.
 */
export function Stage({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.armed = "";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        // One frame with the parts held back, so they have somewhere to move from.
        requestAnimationFrame(() => requestAnimationFrame(() => (el.dataset.in = "")));
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className={cn("sy-stage", className)} ref={ref}>
      {children}
    </div>
  );
}
