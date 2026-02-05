"use client";

import { cn } from "@coss/ui/lib/utils";
import type * as React from "react";
import { useScrollHide } from "@/hooks/use-scroll-hide";

export function MobileHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isHidden = useScrollHide();

  return (
    <header
      className={cn(
        "fixed top-0 z-50 flex h-14 w-full items-center justify-between border-border border-b bg-sidebar px-4 transition-transform duration-500 ease-in-out md:hidden",
        isHidden ? "-translate-y-full" : "translate-y-0",
        className,
      )}
    >
      {children}
    </header>
  );
}
