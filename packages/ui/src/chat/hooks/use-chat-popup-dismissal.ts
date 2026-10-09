"use client";

import { type RefObject, useEffect } from "react";

export function useChatPopupDismissal(
  active: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!active || !trigger) return;
    const onScroll = (event: Event): void => {
      if (event.target instanceof Node && event.target.contains(trigger))
        onDismiss();
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [active, triggerRef, onDismiss]);
}
