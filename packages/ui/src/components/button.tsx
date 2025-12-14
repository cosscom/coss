import { mergeProps } from "@base-ui-components/react/merge-props";
import { useRender } from "@base-ui-components/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@coss/ui/lib/utils";

const buttonVariants = cva(
  "[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border bg-clip-padding font-medium text-[calc(var(--text-sm)+var(--scale-offset)/2)]/(--text-sm--line-height) outline-none transition-shadow [--scale-offset:var(--ui-scale-offset-mobile,0rem)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 sm:[--scale-offset:var(--ui-scale-offset,0rem)] [&_svg:not([class*='size-'])]:size-[calc(--spacing(4)+var(--scale-offset)/2)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-80",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-[calc(--spacing(8)+var(--scale-offset))] px-[calc(--spacing(3)-1px)]",
        icon: "size-[calc(--spacing(8)+var(--scale-offset))]",
        "icon-lg": "size-[calc(--spacing(9)+var(--scale-offset))]",
        "icon-sm": "size-[calc(--spacing(7)+var(--scale-offset))]",
        "icon-xl":
          "size-[calc(--spacing(10)+var(--scale-offset))] [&_svg:not([class*='size-'])]:size-[calc(--spacing(4.5)+var(--scale-offset)/2)]",
        "icon-xs":
          "size-[calc(--spacing(6)+var(--scale-offset))] rounded-md before:rounded-[calc(var(--radius-md)-1px)] not-in-data-[slot=input-group]:[&_svg:not([class*='size-'])]:size-[calc(--spacing(3.5)+var(--scale-offset)/2)] not-in-data-[slot=input-group]:[&_svg:not([class*='size-'])]:size-[calc(--spacing(3.5)+var(--scale-offset)/2)]",
        lg: "h-[calc(--spacing(9)+var(--scale-offset))] px-[calc(--spacing(3.5)-1px)]",
        sm: "h-[calc(--spacing(7)+var(--scale-offset))] gap-1.5 px-[calc(--spacing(2.5)-1px)]",
        xl: "h-[calc(--spacing(10)+var(--scale-offset))] px-[calc(--spacing(4)-1px)] text-[calc(var(--text-base)+var(--scale-offset)/2)] [&_svg:not([class*='size-'])]:size-[calc(--spacing(4.5)+var(--scale-offset)/2)]",
        xs: "h-[calc(--spacing(6)+var(--scale-offset))] gap-1 rounded-md px-[calc(--spacing(2)-1px)] text-[calc(var(--text-xs)+var(--scale-offset)/2)] before:rounded-[calc(var(--radius-md)-1px)] [&_svg:not([class*='size-'])]:size-[calc(--spacing(3.5)+var(--scale-offset)/2)]",
      },
      variant: {
        default:
          "not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] border-primary bg-primary text-primary-foreground shadow-primary/24 shadow-xs hover:bg-primary/90 [&:is(:active,[data-pressed])]:inset-shadow-[0_1px_--theme(--color-black/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none",
        destructive:
          "not-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] border-destructive bg-destructive text-white shadow-destructive/24 shadow-xs hover:bg-destructive/90 [&:is(:active,[data-pressed])]:inset-shadow-[0_1px_--theme(--color-black/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none",
        "destructive-outline":
          "border-border bg-transparent text-destructive-foreground shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none [&:is(:hover,[data-pressed])]:border-destructive/32 [&:is(:hover,[data-pressed])]:bg-destructive/4",
        ghost: "border-transparent hover:bg-accent data-pressed:bg-accent",
        link: "border-transparent underline-offset-4 hover:underline",
        outline:
          "border-border bg-background shadow-xs not-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [&:is(:disabled,:active,[data-pressed])]:shadow-none [&:is(:hover,[data-pressed])]:bg-accent/50 dark:[&:is(:hover,[data-pressed])]:bg-input/64",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/90 data-pressed:bg-secondary/90",
      },
    },
  },
);

interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
}

function Button({ className, variant, size, render, ...props }: ButtonProps) {
  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] =
    render ? undefined : "button";

  const defaultProps = {
    className: cn(buttonVariants({ className, size, variant })),
    "data-slot": "button",
    type: typeValue,
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}

export { Button, buttonVariants };
