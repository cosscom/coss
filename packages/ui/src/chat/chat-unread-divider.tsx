"use client";

import { cn } from "@coss/ui/lib/utils";
import type { ComponentProps, ReactElement } from "react";

export function ChatUnreadDivider({
  children,
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="chat-unread-divider"
      className={cn(
        "my-4 flex items-center gap-3 font-medium text-foreground text-xs",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="h-px flex-1 bg-input" />
      {children}
      <span aria-hidden="true" className="h-px flex-1 bg-input" />
    </div>
  );
}
