import { ScrollArea } from "@coss/ui/components/scroll-area";
import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps } from "react";

/** Tables in docs content (Markdown tables and the generated plan/rate/retention tables). */
export function DocsTable({ className, ...props }: ComponentProps<"table">) {
  return (
    <ScrollArea className="my-6" scrollbarGutter>
      <table className={cn("relative w-full border-none text-sm", className)} {...props} />
    </ScrollArea>
  );
}

export function DocsTh({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-2 text-left font-medium [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  );
}

export function DocsTd({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-4 py-2 text-left align-top [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  );
}

export function DocsTr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("m-0 border-b last:border-b-0", className)} {...props} />;
}
