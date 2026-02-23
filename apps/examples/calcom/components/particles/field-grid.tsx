import { cn } from "@coss/ui/lib/utils";

/**
 * A responsive 2-column grid for form fields.
 * On mobile (< md), all items stack in a single column.
 * On desktop (≥ md), items flow into two equal columns.
 *
 * Each direct child occupies one column by default.
 * Use `FieldGridRow` to span a child across both columns.
 */
function FieldGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-6 md:grid-cols-2", className)}
      {...props}
    />
  );
}

/**
 * A full-width row inside a `FieldGrid`.
 * Spans both columns on desktop while respecting the grid gap.
 */
function FieldGridRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("col-span-full", className)} {...props} />;
}

export { FieldGrid, FieldGridRow };
