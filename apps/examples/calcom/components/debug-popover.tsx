"use client";

import { Label } from "@coss/ui/components/label";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { Switch } from "@coss/ui/components/switch";
import type * as React from "react";
import { useDebug } from "./debug-context";

export function DebugPopover(): React.ReactElement {
  const {
    enableArtificialDelay,
    isLoadingOverride,
    setEnableArtificialDelay,
    setIsLoadingOverride,
  } = useDebug();

  return (
    <Popover>
      <PopoverTrigger className="cursor-pointer text-[0.625rem] text-sidebar-foreground/50 hover:text-sidebar-foreground/70">
        Debug
      </PopoverTrigger>
      <PopoverPopup align="center" className="w-64" side="top">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="delay-switch">Enable artificial delay</Label>
            <Switch
              checked={enableArtificialDelay}
              id="delay-switch"
              onCheckedChange={setEnableArtificialDelay}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="loading-switch">Force loading state</Label>
            <Switch
              checked={isLoadingOverride === true}
              id="loading-switch"
              onCheckedChange={(checked: boolean): void =>
                setIsLoadingOverride(checked ? true : null)
              }
            />
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
