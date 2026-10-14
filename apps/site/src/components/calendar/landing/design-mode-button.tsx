"use client";

import { Button } from "@coss/ui/components/button";
import { Kbd, KbdGroup } from "@coss/ui/components/kbd";
import { cn } from "@coss/ui/lib/utils";
import { useDesignMode } from "kloq/design-mode";

/** Lives inside <Kloq>'s chrome slot, so it reaches the calendar's own design-mode provider. */
export function DesignModeButton() {
  const { enabled, toggle } = useDesignMode();
  return (
    <Button size="sm" variant="outline" aria-pressed={enabled} onClick={toggle}>
      <KbdGroup>
        <Kbd>⌥</Kbd>
        <Kbd>D</Kbd>
      </KbdGroup>
      <span className="max-sm:hidden">design mode</span>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", enabled ? "bg-brand" : "bg-muted-foreground/30")}
      />
    </Button>
  );
}
