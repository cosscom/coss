"use client";

import { Toggle as TogglePrimitive } from "@base-ui-components/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@coss/ui/lib/utils";

const toggleVariants = cva(
  "[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-medium text-[calc(var(--text-sm)+var(--scale-offset)/2)]/(--text-sm--line-height) outline-none transition-shadow [--scale-offset:var(--ui-scale-offset-mobile,0rem)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 data-pressed:bg-accent data-pressed:text-accent-foreground data-pressed:transition-none dark:data-pressed:bg-input/80 dark:hover:bg-accent sm:[--scale-offset:var(--ui-scale-offset,0rem)] [&_svg:not([class*='size-'])]:size-[calc(--spacing(4)+var(--scale-offset)/2)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-80",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-[calc(--spacing(8)+var(--scale-offset))] min-w-[calc(--spacing(8)+var(--scale-offset))] px-[calc(--spacing(2)-1px)]",
        lg: "h-[calc(--spacing(9)+var(--scale-offset))] min-w-[calc(--spacing(9)+var(--scale-offset))] px-[calc(--spacing(2.5)-1px)]",
        sm: "h-[calc(--spacing(7)+var(--scale-offset))] min-w-[calc(--spacing(7)+var(--scale-offset))] px-[calc(--spacing(1.5)-1px)]",
      },
      variant: {
        default: "border-transparent",
        outline:
          "border-border bg-clip-padding shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:hover:bg-input/64 dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] dark:not-disabled:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/4%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none",
      },
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      className={cn(toggleVariants({ className, size, variant }))}
      data-slot="toggle"
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
