import type * as React from "react";
import { cn } from "@/registry/default/lib/utils";

export type TableVariant = "default" | "boxed";

export function Table({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"table"> & {
  variant?: TableVariant;
}): React.ReactElement {
  return (
    <div
      className="relative w-full overflow-x-auto"
      data-slot="table-container"
      data-variant={variant}
    >
      <table
        className={cn(
          "w-full caption-bottom in-data-[variant=boxed]:border-separate in-data-[variant=boxed]:border-spacing-0 text-sm",
          className,
        )}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">): React.ReactElement {
  return (
    <thead
      className={cn("[&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">): React.ReactElement {
  return (
    <tbody
      className={cn(
        "relative in-data-[variant=boxed]:rounded-xl in-data-[variant=boxed]:shadow-xs/5 before:pointer-events-none before:absolute before:inset-px not-in-data-[variant=boxed]:before:hidden before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/8%)] [&_tr:last-child]:border-0 in-data-[variant=boxed]:*:[tr]:border-0 in-data-[variant=boxed]:*:[tr]:bg-card in-data-[variant=boxed]:*:[tr]:*:[td]:border-b in-data-[variant=boxed]:*:[tr]:first:*:[td]:first:rounded-ss-xl in-data-[variant=boxed]:*:[tr]:*:[td]:first:border-s in-data-[variant=boxed]:*:[tr]:first:*:[td]:border-t in-data-[variant=boxed]:*:[tr]:last:*:[td]:last:rounded-ee-xl in-data-[variant=boxed]:*:[tr]:*:[td]:last:border-e in-data-[variant=boxed]:*:[tr]:first:*:[td]:last:rounded-se-xl in-data-[variant=boxed]:*:[tr]:last:*:[td]:first:rounded-es-xl in-data-[variant=boxed]:*:[tr]:hover:*:[td]:bg-muted/32 in-data-[variant=boxed]:*:[tr]:data-[state=selected]:*:[td]:bg-muted/50",
        className,
      )}
      data-slot="table-body"
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">): React.ReactElement {
  return (
    <tfoot
      className={cn(
        "border-t in-data-[variant=boxed]:border-none bg-muted/32 in-data-[variant=boxed]:bg-transparent font-medium [&>tr]:last:border-b-0 in-data-[variant=boxed]:**:[td]:min-h-10",
        className,
      )}
      data-slot="table-footer"
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<"tr">): React.ReactElement {
  return (
    <tr
      className={cn(
        "border-b not-in-data-[variant=boxed]:hover:bg-muted/32 not-in-data-[variant=boxed]:data-[state=selected]:bg-muted/50",
        className,
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<"th">): React.ReactElement {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-2.5 text-left align-middle font-medium text-muted-foreground leading-none has-[[role=checkbox]]:w-px has-[[role=checkbox]]:pe-0",
        className,
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">): React.ReactElement {
  return (
    <td
      className={cn(
        "whitespace-nowrap bg-clip-padding p-2.5 align-middle leading-none in-data-[variant=boxed]:first:p-[calc(--spacing(2.5)-1px)] in-data-[variant=boxed]:last:p-[calc(--spacing(2.5)-1px)] has-[[role=checkbox]]:pe-0",
        className,
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">): React.ReactElement {
  return (
    <caption
      className={cn(
        "in-data-[variant=boxed]:my-4 mt-4 text-muted-foreground text-sm",
        className,
      )}
      data-slot="table-caption"
      {...props}
    />
  );
}
