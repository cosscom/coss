"use client";

import { useEffect } from "react";

/**
 * When a hub page is framed (the front page's product demo), everything on the hub stays
 * clickable inside the frame, while links that leave the hub open in a new tab instead of
 * navigating the frame (the CSP would refuse another origin in it anyway).
 */
export function Framed() {
  useEffect(() => {
    if (window.self === window.top) return;
    document.documentElement.dataset.framed = "";
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.origin === window.location.origin) return;
      event.preventDefault();
      window.open(anchor.href, "_blank", "noopener");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
