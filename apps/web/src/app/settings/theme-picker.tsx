"use client";

import { ToggleGroup, ToggleGroupItem } from "@coss/ui/components/toggle-group";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { THEME_OPTIONS } from "@/components/shell/theme-options";

const subscribe = () => () => {};

/** The dashboard's theme in this browser (next-themes keeps it in local storage). */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser: render nothing pressed on the server.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <ToggleGroup
      aria-label="Theme"
      onValueChange={(value) => {
        if (value[0]) setTheme(value[0] as string);
      }}
      value={mounted && theme ? [theme] : []}
      variant="outline"
    >
      {THEME_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          <option.icon />
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
