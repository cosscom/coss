import type * as React from "react";
import { HeaderActions } from "@/components/header-actions";
import { Logo } from "@/components/logo";
import { MobileHeader } from "@/components/mobile-header";

export function AppMobileHeader(): React.ReactElement {
  return (
    <MobileHeader>
      <Logo />
      <HeaderActions />
    </MobileHeader>
  );
}
