"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the page's server components every `seconds` while it is visible. */
export function AutoRefresh(props: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, props.seconds * 1000);
    return () => clearInterval(timer);
  }, [router, props.seconds]);
  return null;
}
