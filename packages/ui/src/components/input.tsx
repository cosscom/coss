"use client";

import { Input as InputPrimitive } from "@base-ui-components/react/input";
import type * as React from "react";

import { cn } from "@coss/ui/lib/utils";

type InputProps = Omit<
  InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "default" | "lg" | number;
  unstyled?: boolean;
};

function Input({
  className,
  size = "default",
  unstyled = false,
  ...props
}: InputProps) {
  return (
    <span
      className={
        cn(
          !unstyled &&
            "relative inline-flex w-full rounded-lg border border-input bg-background bg-clip-padding text-base shadow-xs ring-ring/24 transition-shadow [--scale-offset:var(--ui-scale-offset-mobile,0rem)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:has-aria-invalid:border-destructive/64 has-focus-visible:has-aria-invalid:ring-destructive/16 has-aria-invalid:border-destructive/36 has-focus-visible:border-ring has-disabled:opacity-64 has-[:disabled,:focus-visible,[aria-invalid]]:shadow-none has-focus-visible:ring-[3px] sm:text-sm dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:has-aria-invalid:ring-destructive/24 dark:not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/8%)] sm:[--scale-offset:var(--ui-scale-offset,0rem)]",
          className,
        ) || undefined
      }
      data-size={size}
      data-slot="input-control"
    >
      <InputPrimitive
        className={cn(
          "h-[calc(--spacing(8)-2px+var(--scale-offset))] w-full min-w-0 rounded-[inherit] px-[calc(--spacing(3)-1px)] leading-[calc(--spacing(8)-2px+var(--scale-offset))] outline-none placeholder:text-muted-foreground/72",
          size === "sm" &&
            "h-[calc(--spacing(7)-2px+var(--scale-offset))] px-[calc(--spacing(2.5)-1px)]",
          size === "lg" && "h-[calc(--spacing(9)-2px+var(--scale-offset))]",
          props.type === "search" &&
            "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
          props.type === "file" &&
            "text-muted-foreground file:me-3 file:bg-transparent file:font-medium file:text-foreground file:text-sm",
        )}
        data-slot="input"
        size={typeof size === "number" ? size : undefined}
        {...props}
      />
    </span>
  );
}

export { Input, type InputProps };
