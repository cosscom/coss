import { Button } from "@coss/ui/components/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { MobileHeader } from "@/components/mobile-header";
import { SettingsDrawer } from "@/components/settings/settings-drawer";

export function SettingsMobileHeader(): React.ReactElement {
  return (
    <MobileHeader>
      <Button
        aria-label="Back"
        render={<Link href="/event-types" />}
        variant="ghost"
      >
        <ArrowLeftIcon className="-ms-0.5" />
        <span>Back</span>
      </Button>
      <SettingsDrawer />
    </MobileHeader>
  );
}
