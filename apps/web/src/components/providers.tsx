"use client";

import { TooltipProvider } from "@coss/ui/components/tooltip";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client providers of every page: the theme (`.dark` on `<html>`, following the system until the
 * user picks one in the user menu or ⌘K) and shared tooltip delays.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <TooltipProvider delay={400}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
