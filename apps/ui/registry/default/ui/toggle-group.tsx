"use client";

import type { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/registry/default/lib/utils";
import { Separator } from "@/registry/default/ui/separator";
import {
  Toggle as ToggleComponent,
  type toggleVariants,
} from "@/registry/default/ui/toggle";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  orientation = "horizontal",
  children,
  ...props
}: ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive
      className={cn(
        "flex w-fit *:focus-visible:z-10",
        orientation === "horizontal"
          ? "*:pointer-coarse:after:min-w-auto"
          : "*:pointer-coarse:after:min-h-auto",
        variant === "default"
          ? "gap-0.5"
          : orientation === "horizontal"
            ? "*:[[data-slot]~[data-slot]]:before:-start-[0.5px] *:data-slot:has-[~[data-slot]]:before:-end-[0.5px] *:[[data-slot]~[data-slot]]:rounded-s-none *:data-slot:has-[~[data-slot]]:rounded-e-none *:[[data-slot]~[data-slot]]:border-s-0 *:data-slot:has-[~[data-slot]]:border-e-0 *:[[data-slot]~[data-slot]]:before:rounded-s-none *:data-slot:has-[~[data-slot]]:before:rounded-e-none" : "*:[[data-slot]~[data-slot]]:before:-top-[0.5px] *:data-slot:has-[~[data-slot]]:before:-bottom-[0.5px] flex-col *:[[data-slot]~[data-slot]]:rounded-t-none *:data-slot:has-[~[data-slot]]:rounded-b-none *:[[data-slot]~[data-slot]]:border-t-0 *:data-slot:has-[~[data-slot]]:border-b-0 *:data-slot:has-[~[data-slot]]:before:hidden *:[[data-slot]~[data-slot]]:before:rounded-t-none *:data-slot:has-[~[data-slot]]:before:rounded-b-none dark:*:last:before:hidden dark:*:first:before:block",
        className,
      )}
      data-size={size}
      data-slot="toggle-group"
      data-variant={variant}
      orientation={orientation}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ size, variant }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function Toggle({
  className,
  children,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  const resolvedVariant = context.variant || variant;
  const resolvedSize = context.size || size;

  return (
    <ToggleComponent
      className={className}
      data-size={resolvedSize}
      data-variant={resolvedVariant}
      size={resolvedSize}
      variant={resolvedVariant}
      {...props}
    >
      {children}
    </ToggleComponent>
  );
}

function ToggleGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: {
  className?: string;
} & React.ComponentProps<typeof Separator>) {
  return (
    <Separator className={className} orientation={orientation} {...props} />
  );
}

export { ToggleGroup, Toggle, Toggle as ToggleGroupItem, ToggleGroupSeparator };
