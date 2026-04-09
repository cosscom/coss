"use client";

import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import type * as React from "react";

export function FilterBarActions({
  className,
  onClear,
  onSave,
}: {
  className?: string;
  onClear: () => void;
  onSave?: () => void;
}): React.ReactElement {
  return (
    <div className={cn("ms-auto flex items-center gap-1", className)}>
      <Button onClick={onClear} size="xs" variant="ghost">
        Clear
      </Button>
      <Button
        onClick={(): void => {
          onSave?.();
        }}
        size="xs"
        variant="outline"
      >
        Save
      </Button>
    </div>
  );
}
