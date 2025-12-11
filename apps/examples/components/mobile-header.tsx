"use client";

import { Logo } from "@/components/logo";
import { HeaderActions } from "@/components/header-actions";

export function MobileHeader() {
  return (
    <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-border border-b bg-sidebar px-4 md:hidden">
      <Logo />
      <HeaderActions />
    </header>
  );
}
