"use client";

import { Switch as SwitchPrimitive } from "@base-ui-components/react/switch";

import { cn } from "@coss/ui/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group/switch inset-shadow-[0_1px_--theme(--color-black/4%)] inline-flex h-[calc(--spacing(4.5)+var(--scale-offset))] w-[calc(--spacing(7.5)+var(--scale-offset)*2)] shrink-0 items-center rounded-full p-px outline-none transition-all [--scale-offset:var(--ui-scale-offset-mobile,0rem)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-checked:bg-primary data-unchecked:bg-input data-disabled:opacity-64 sm:[--scale-offset:var(--ui-scale-offset,0rem)]",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-[calc(--spacing(4)+var(--scale-offset))] rounded-full bg-background shadow-sm transition-[translate,width] group-active/switch:not-data-disabled:w-[calc(--spacing(4.5)+var(--scale-offset))] data-checked:translate-x-[calc(--spacing(3)+var(--scale-offset))] data-unchecked:translate-x-0 data-checked:group-active/switch:translate-x-[calc(--spacing(2.5)+var(--scale-offset))]",
        )}
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
