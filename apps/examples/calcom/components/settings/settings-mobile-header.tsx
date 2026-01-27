import { Button } from "@coss/ui/components/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { SettingsSheet } from "@/components/settings/settings-sheet";

export function SettingsMobileHeader() {
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
      <SettingsSheet />
    </MobileHeader>
  );
}
