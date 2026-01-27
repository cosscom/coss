"use client";

import { Label } from "@coss/ui/components/label";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { Switch } from "@coss/ui/components/switch";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { useDebug } from "./debug-context";

export function DebugPopover() {
  const {
    enableArtificialDelay,
    isLoadingOverride,
    setEnableArtificialDelay,
    setIsLoadingOverride,
  } = useDebug();
  const { resolvedTheme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const handleDarkModeToggle = useCallback(
    (checked: boolean) => {
      setIsDark(checked);
      setTheme(checked ? "dark" : "light");
    },
    [setTheme],
  );

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
              onCheckedChange={(checked) =>
                setIsLoadingOverride(checked ? true : null)
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="dark-mode-switch">Dark mode</Label>
            <Switch
              checked={isDark}
              id="dark-mode-switch"
              onCheckedChange={handleDarkModeToggle}
            />
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
