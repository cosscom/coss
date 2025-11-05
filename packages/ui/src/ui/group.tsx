import * as React from "react"
import { mergeProps } from "@base-ui-components/react/merge-props"
import { useRender } from "@base-ui-components/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@coss/ui/lib/utils"
import { Separator } from "@coss/ui/ui/separator"

const groupVariants = cva(
  "flex w-fit *:focus-visible:z-10 *:has-focus-visible:z-10",
  {
    variants: {
      orientation: {
        horizontal:
          "*:not-first:rounded-s-none *:not-first:border-s-0 *:not-last:rounded-e-none *:not-last:border-e-0 *:not-first:before:-start-[0.5px] *:not-first:before:rounded-s-none *:not-last:before:-end-[0.5px] *:not-last:before:rounded-e-none *:pointer-coarse:after:min-w-auto",
        vertical:
          "flex-col *:not-first:rounded-t-none *:not-first:border-t-0 *:not-last:rounded-b-none *:not-last:border-b-0 *:not-first:before:-top-[0.5px] *:not-first:before:rounded-t-none *:not-last:before:-bottom-[0.5px] *:not-last:before:hidden *:not-last:before:rounded-b-none dark:*:first:before:block dark:*:last:before:hidden *:pointer-coarse:after:min-h-auto",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function Group({
  className,
  orientation,
  children,
  ...props
}: {
  className?: string
  orientation?: VariantProps<typeof groupVariants>["orientation"]
  children: React.ReactNode
} & React.ComponentProps<"div">) {
  return (
    <div
      data-slot="group"
      data-orientation={orientation}
      className={cn(groupVariants({ orientation }), className)}
      role="group"
      {...props}
    >
      {children}
    </div>
  )
}

function GroupText({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    "data-slot": "group-text",
    className: cn(
      "relative inline-flex rounded-lg border border-border bg-muted bg-clip-padding px-[calc(--spacing(3)-1px)] text-sm font-medium whitespace-nowrap shadow-xs transition-shadow outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/64 dark:before:shadow-[0_-1px_--theme(--color-white/8%)] [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    ),
  }
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps(defaultProps, props),
  })
}

function GroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: {
  className?: string
} & React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      orientation={orientation}
      className={cn(
        "relative z-20 has-[+[data-slot=input-control]:focus-within,+[data-slot=select-trigger]:focus-visible+*]:translate-x-px has-[+[data-slot=input-control]:focus-within,+[data-slot=select-trigger]:focus-visible+*]:bg-ring [[data-slot=input-control]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&]:-translate-x-px [[data-slot=input-control]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&]:bg-ring",
        className
      )}
      {...props}
    />
  )
}

export { Group, GroupText, GroupSeparator, groupVariants }
