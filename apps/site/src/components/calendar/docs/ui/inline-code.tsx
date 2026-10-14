import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps } from "react";

/** `block` is set by the `pre` map for the `<code>` shiki emits inside a fenced block. */
export function Code({ block, className, ...props }: ComponentProps<"code"> & { block?: boolean }) {
  return <code {...props} className={cn(!block && "docs-inline-code", className)} />;
}
