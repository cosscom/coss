"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui-components/react/checkbox"

import { cn } from "@workspace/ui/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border border-input bg-background bg-clip-padding ring-ring transition-[box-shadow,border-color] outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(0.25rem-1px)] not-disabled:not-aria-invalid:not-data-checked:before:shadow-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-64 aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/48 dark:bg-clip-border dark:shadow-black/24 dark:not-data-checked:bg-input/32 dark:not-disabled:not-data-checked:shadow-sm dark:not-disabled:not-aria-invalid:not-data-checked:before:shadow-[0_-1px_--theme(--color-white/8%)] dark:aria-invalid:ring-destructive/24",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="absolute -inset-px flex items-center justify-center rounded-[0.25rem] text-primary-foreground data-checked:bg-primary data-indeterminate:text-foreground data-unchecked:hidden"
        render={(props, state) => (
          <span {...props}>
            {state.indeterminate ? (
              <svg
                className="size-3"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.252 12h13.496" />
              </svg>
            ) : (
              <svg
                className="size-3"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
              </svg>
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
