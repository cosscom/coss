"use client";
import { Button } from "@coss/ui/components/button";
import { LayerMask01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
// The `next-themes` instance Fumadocs' RootProvider runs (another copy would see no context).
import { useTheme } from "fumadocs-ui/provider/base";
import { useCallback } from "react";

export function ModeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <Button
      className="relative size-8"
      onClick={toggleTheme}
      size="icon"
      title="Toggle theme"
      variant="ghost"
    >
      <HugeiconsIcon className="size-4 -rotate-45" icon={LayerMask01Icon} strokeWidth={2} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
