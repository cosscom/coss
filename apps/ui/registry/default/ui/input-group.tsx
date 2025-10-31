"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/default/ui/button"
import { Input } from "@/registry/default/ui/input"
import { Textarea } from "@/registry/default/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "relative inline-flex w-full rounded-lg border border-input bg-background bg-clip-padding text-base/5 shadow-xs ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] sm:text-sm dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border",
        "not-has-[>*>input:disabled,>*>textarea:disabled]:not-has-[>*>input:focus-visible,>*>textarea:focus-visible]:not-has-[>*>input[aria-invalid],>*>textarea[aria-invalid]]:before:shadow-[0_1px_--theme(--color-black/4%)] has-[>*>input:disabled,>*>textarea:disabled]:opacity-64 has-[>*>input:disabled,>*>textarea:disabled,input:focus-visible,>*>textarea:focus-visible,input[aria-invalid],>*>textarea[aria-invalid]]:shadow-none has-[>*>input:focus-visible,>*>textarea:focus-visible]:border-ring has-[>*>input:focus-visible,>*>textarea:focus-visible]:ring-[3px] has-[>*>input[aria-invalid],>*>textarea[aria-invalid]]:border-destructive/36 has-[>*>input:focus-visible,>*>textarea:focus-visible]:has-[>*>input[aria-invalid],>*>textarea[aria-invalid]]:border-destructive/64 has-[>*>input:focus-visible,>*>textarea:focus-visible]:has-[>*>input[aria-invalid],>*>textarea[aria-invalid]]:ring-destructive/16 dark:not-has-[>*>input:disabled,>*>textarea:disabled]:not-has-[>*>input:focus-visible,>*>textarea:focus-visible]:not-has-[>*>input[aria-invalid],>*>textarea[aria-invalid]]:before:shadow-[0_-1px_--theme(--color-white/8%)] dark:has-[>*>input[aria-invalid],>*>textarea[aria-invalid]]:ring-destructive/24",
        "group/input-group items-center",
        "min-w-0 has-[>*>textarea]:h-auto *:[&:is([data-slot=input-control],[data-slot=field-control],[data-slot=textarea-control])]:contents *:[&:is([data-slot=input-control],[data-slot=field-control],[data-slot=textarea-control])]:before:hidden",
        // Variants based on alignment.
        "has-[>[data-align=inline-start]]:[&>*>input]:ps-2 has-[>[data-align=inline-start]]:[&>[data-size=sm]>input]:ps-1.5",
        "has-[>[data-align=inline-end]]:[&>*>input]:pe-2 has-[>[data-align=inline-end]]:[&>[data-size=sm]>input]:pe-1.5",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>*>input]:pb-[calc(--spacing(3)-1px)]",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>*>input]:pt-3",
        "**:[button]:rounded-[calc(var(--radius-md)-1px)]",
        "[&>*>textarea]:min-h-20.5 [&>*>textarea]:resize-none [&>*>textarea]:py-[calc(--spacing(3)-1px)] [&>*>textarea]:max-sm:min-h-23.5",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-64 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first ps-[calc(--spacing(3)-1px)] has-[>[data-slot=badge]]:-ms-1.5 has-[>button]:-ms-2 has-[>kbd]:ms-[-0.35rem] [[data-size=sm]+&]:ps-[calc(--spacing(2.5)-1px)]",
        "inline-end":
          "order-last pe-[calc(--spacing(3)-1px)] has-[>[data-slot=badge]]:-me-1.5 has-[>button]:-me-2 has-[>kbd]:me-[-0.35rem] [[data-size=sm]+&]:pe-[calc(--spacing(2.5)-1px)]",
        "block-start":
          "order-first w-full justify-start px-[calc(--spacing(3)-1px)] pt-[calc(--spacing(3)-1px)] group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-[calc(--spacing(3)-1px)] [[data-size=sm]+&]:px-[calc(--spacing(2.5)-1px)]",
        "block-end":
          "order-last w-full justify-start px-[calc(--spacing(3)-1px)] pb-[calc(--spacing(3)-1px)] group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-[calc(--spacing(3)-1px)] [[data-size=sm]+&]:px-[calc(--spacing(2.5)-1px)]",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.preventDefault()
        const parent = e.currentTarget.parentElement
        const input = parent?.querySelector("input")
        if (input && !parent?.querySelector("input:focus")) {
          input.focus()
        }
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "min-h-none flex items-center gap-2 shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius-md)-1px)] px-[calc(--spacing(2)-1px)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius-md)-1px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <Input data-slot="input-group-control" {...props} />
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return <Textarea data-slot="input-group-control" {...props} />
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
