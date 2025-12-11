"use client";

import { cn } from "@coss/ui/lib/utils";
import { HeaderActions } from "@/components/header-actions";
import { Logo } from "@/components/logo";
import { useScrollHide } from "@/hooks/use-scroll-hide";

export function MobileHeader() {
  const isHidden = useScrollHide();

  return (
    <header
      className={cn(
        "fixed top-0 z-50 flex h-14 w-full items-center justify-between border-border border-b bg-sidebar px-4 md:hidden transition-transform duration-500 ease-in-out",
        isHidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <Logo />
      <HeaderActions />
    </header>
  );
}
