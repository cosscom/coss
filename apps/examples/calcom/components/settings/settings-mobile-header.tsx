"use client";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { SettingsSheet } from "@/components/settings/settings-sheet";
import { useScrollHide } from "@/hooks/use-scroll-hide";

export function SettingsMobileHeader() {
  const isHidden = useScrollHide();

  return (
    <header
      className={cn(
        "fixed top-0 z-50 flex h-14 w-full items-center justify-between border-border border-b bg-sidebar px-4 transition-transform duration-500 ease-in-out md:hidden",
        isHidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <SettingsSheet>
        <Button aria-label="Menu" size="icon" variant="ghost">
          <MenuIcon className="size-5" />
        </Button>
      </SettingsSheet>
      <Button
        aria-label="Back"
        render={<Link href="/event-types" />}
        size="sm"
        variant="ghost"
      >
        <ArrowLeftIcon className="size-4" />
        <span>Back</span>
      </Button>
    </header>
  );
}
