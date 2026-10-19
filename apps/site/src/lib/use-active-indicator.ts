"use client";
import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

export type IndicatorRect = { top: number; left: number; width: number; height: number };

/**
 * Where the link to `href` sits inside `container`, for a highlight that slides between links
 * (kept in step with resizes: links can wrap, and content above them can unfold). `animate` turns
 * on after the first placement, so the highlight appears in place and only slides when the active
 * link changes.
 */
export function useActiveIndicator(container: RefObject<HTMLElement | null>, href: string | null) {
  const [rect, setRect] = useState<IndicatorRect | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root || !href) {
      setRect(null);
      return;
    }
    const selector = `a[href="${CSS.escape(href)}"]`;
    const measure = () => {
      // Looked up every time: a folded API resource in the docs sidebar unmounts its links, and
      // a link folded away has nothing to highlight.
      const link = root.querySelector<HTMLElement>(selector);
      if (!link || link.getClientRects().length === 0) return setRect(null);
      const outer = root.getBoundingClientRect();
      const inner = link.getBoundingClientRect();
      const next = {
        top: inner.top - outer.top,
        left: inner.left - outer.left,
        width: inner.width,
        height: inner.height,
      };
      setRect((current) => (current && sameRect(current, next) ? current : next));
    };
    measure();
    // A container of fixed height (the scrolling sidebar) doesn't resize when the content inside
    // it does, so its children are watched too (not the highlight itself, which follows them).
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    for (const child of root.children) {
      if (child.getAttribute("aria-hidden") !== "true") observer.observe(child);
    }
    return () => observer.disconnect();
  }, [container, href]);

  useEffect(() => {
    if (!rect) return setAnimate(false);
    if (animate) return;
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [rect, animate]);

  return { rect, animate };
}

function sameRect(a: IndicatorRect, b: IndicatorRect): boolean {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}
