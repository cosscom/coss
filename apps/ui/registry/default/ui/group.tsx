import * as React from "react"
import { mergeProps } from "@base-ui-components/react/merge-props"
import { useRender } from "@base-ui-components/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/registry/default/ui/separator"

const groupVariants = cva(
  "group flex w-fit [--clip-end:-1rem] [--clip-start:-1rem] *:pointer-coarse:after:min-w-auto [&>*]:focus-visible:z-10",
  {
    variants: {
      orientation: {
        horizontal:
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
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

function GroupItem({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const defaultProps = {
    className: cn(
      "border-x-0 group-data-[orientation=vertical]:border-x group-data-[orientation=vertical]:border-t-0 group-data-[orientation=vertical]:border-b-0 before:[clip-path:inset(-1rem_var(--clip-end)_-1rem_var(--clip-start))] not-first:before:-start-0.5 not-first:before:rounded-s-none not-first:before:[--clip-start:2px] not-last:before:-end-0.5 not-last:before:rounded-e-none not-last:before:[--clip-end:2px] group-data-[orientation=vertical]:not-first:before:-top-0.5 group-data-[orientation=vertical]:not-first:before:rounded-t-none group-data-[orientation=vertical]:not-last:before:-bottom-0.5 group-data-[orientation=vertical]:not-last:before:rounded-b-none first:border-s group-data-[orientation=vertical]:first:border-t last:border-e group-data-[orientation=vertical]:last:border-b focus-visible:z-10 has-focus-visible:z-10 not-last:has-[+[data-slot=separator]]:before:[--clip-end:1.5px] [[data-slot=separator]+&]:before:[--clip-start:1.5px]",
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
        "relative z-20 has-[+[data-slot=input-control]:focus-within,+[data-slot=field-control]:focus-within,+[data-slot=select-trigger]:focus-visible+*]:translate-x-px has-[+[data-slot=input-control]:focus-within,+[data-slot=field-control]:focus-within,+[data-slot=select-trigger]:focus-visible+*]:bg-ring [[data-slot=input-control]:focus-within+&,[data-slot=field-control]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&]:-translate-x-px [[data-slot=input-control]:focus-within+&,[data-slot=field-control]:focus-within+&,[data-slot=select-trigger]:focus-visible+*+&]:bg-ring",
        className
      )}
      {...props}
    />
  )
}

export { Group, GroupItem, GroupSeparator, groupVariants }
