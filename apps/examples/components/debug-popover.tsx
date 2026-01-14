"use client";

import { Button } from "@coss/ui/components/button";
import { Label } from "@coss/ui/components/label";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { Switch } from "@coss/ui/components/switch";
import { BugIcon } from "lucide-react";
import { useDebug } from "./debug-context";

export function DebugPopover() {
  const { isLoadingOverride, setIsLoadingOverride } = useDebug();

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Popover>
        <PopoverTrigger
          render={
            <Button size="icon" variant="outline">
              <BugIcon className="size-4" />
            </Button>
          }
        />
        <PopoverPopup align="end" className="w-64" side="top">
          <div className="flex flex-col gap-4">
            <PopoverTitle>Debug Controls</PopoverTitle>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="loading-switch">Force loading state</Label>
              <Switch
                checked={isLoadingOverride === true}
                id="loading-switch"
                onCheckedChange={(checked) =>
                  setIsLoadingOverride(checked ? true : null)
                }
              />
            </div>
          </div>
        </PopoverPopup>
      </Popover>
    </div>
  );
}
