"use client";

import { Button } from "@coss/ui/components/button";
import type { FontVariant } from "../fonts";
import { useFontVariant } from "./font-provider";

const VARIANTS: { value: FontVariant; label: string }[] = [
  { label: "Inter", value: "inter" },
  { label: "Current Cal Sans UI", value: "default" },
  { label: "7% bigger", value: "variant1" },
  { label: "5% bigger", value: "variant2" },
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
    side === "right" ? "end-4 bottom-4" : "start-4 bottom-4";

  return (
    <div
      aria-label="Font variant"
      className={`fixed z-50 flex flex-col gap-1 rounded-lg border border-border bg-popover px-2 py-2 shadow-sm ${positionClass} ${className ?? ""}`}
      role="group"
    >
      <span className="px-2 py-1 font-medium text-muted-foreground text-xs">
        Font
      </span>
      <div className="flex flex-col gap-0.5">
        {VARIANTS.map(({ value, label }) => (
          <Button
            className="justify-start font-sans"
            key={value}
            onClick={() => setFontVariant(value)}
            size="sm"
            variant={fontVariant === value ? "secondary" : "ghost"}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
