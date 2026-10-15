"use client";

import { ToastProvider } from "@coss/ui/components/toast";
import { TooltipProvider } from "@coss/ui/components/tooltip";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client providers of every page: the theme (`.dark` on `<html>`, following the system until the
 * user picks one in the user menu or ⌘K), shared tooltip delays and toasts (`@/lib/toast`). They
 * sit in the root layout, so a toast shown just before a navigation survives it.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <TooltipProvider delay={400}>
        <ToastProvider>{children}</ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
