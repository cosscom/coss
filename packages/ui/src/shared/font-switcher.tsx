"use client";

import { Button } from "@coss/ui/components/button";
import { useFontVariant } from "./font-provider";
import type { FontVariant } from "../fonts";

const VARIANTS: { value: FontVariant; label: string }[] = [
  { value: "inter", label: "Inter" },
  { value: "default", label: "Current Cal Sans UI" },
  { value: "variant1", label: "7% bigger" },
  { value: "variant2", label: "5% bigger" },
];

type FontSwitcherProps = {
  /** Side of the screen for the floating panel. Default: "right" */
  side?: "left" | "right";
  /** Optional className for the container. */
  className?: string;
};

export function FontSwitcher({ side = "right", className }: FontSwitcherProps) {
  const { fontVariant, setFontVariant } = useFontVariant();

  const positionClass =
    side === "right"
      ? "end-4 bottom-4"
      : "start-4 bottom-4";

  return (
    <div
      className={`fixed z-50 flex flex-col gap-1 rounded-lg border border-border bg-popover px-2 py-2 shadow-sm ${positionClass} ${className ?? ""}`}
      role="group"
      aria-label="Font variant"
    >
      <span className="px-2 py-1 text-muted-foreground text-xs font-medium">
        Font
      </span>
      <div className="flex flex-col gap-0.5">
        {VARIANTS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={fontVariant === value ? "secondary" : "ghost"}
            className="justify-start font-sans"
            onClick={() => setFontVariant(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
