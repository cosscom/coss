import { cn } from "@coss/ui/lib/utils";
import type { CSSProperties } from "react";

interface ItemLabelProps {
  colorLight?: string;
  colorDark?: string;
  className?: string;
}

export function ItemLabel({
  colorLight,
  colorDark,
  className,
}: ItemLabelProps) {
  const hasColor = colorLight || colorDark;
  if (!hasColor) return null;

  const style = {
    "--label-color-dark": colorDark || "transparent",
    "--label-color-light": colorLight || "transparent",
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-4.5 start-2.5 in-[[data-slot=resource-item]:hover,[data-slot=resource-item]:has([data-slot=resource-item-drag-handle]:focus-visible),[data-slot=resource-item][data-overlay],[data-drag-ended]]:top-11 w-[3px] rounded-full bg-(--label-color-light) not-in-data-drag-ended:transition-[top] dark:bg-(--label-color-dark)",
        className,
      )}
      data-slot="item-label-color"
      style={style}
    />
  );
}
