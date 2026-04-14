"use client";

import { Button, buttonVariants } from "@coss/ui/components/button";
import { Group, GroupSeparator, GroupText } from "@coss/ui/components/group";
import { cn } from "@coss/ui/lib/utils";
import { XIcon } from "lucide-react";
import type * as React from "react";

export function FilterChipShell({
  children,
  label,
  onRemove,
}: {
  children: React.ReactNode;
  label: string;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <Group>
      <GroupText
        className={cn(
          buttonVariants({
            size: "xs",
            variant: "outline",
          }),
          "pointer-events-none",
        )}
      >
        {label}
      </GroupText>
      <GroupSeparator />
      {children}
      <GroupSeparator />
      <Button
        aria-label="Remove filter"
        onClick={onRemove}
        size="icon-xs"
        variant="outline"
      >
        <XIcon />
      </Button>
    </Group>
  );
}
