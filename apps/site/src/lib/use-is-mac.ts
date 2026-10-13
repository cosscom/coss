"use client";
import { useEffect, useState } from "react";

/** Whether to show ⌘ or Ctrl in shortcuts (assumes a Mac until the browser says otherwise). */
export function useIsMac() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);
  return isMac;
}
