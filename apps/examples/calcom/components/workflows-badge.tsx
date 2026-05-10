import { Badge } from "@coss/ui/components/badge";
import { cn } from "@coss/ui/lib/utils";
import { SparklesIcon } from "lucide-react";
import type * as React from "react";

export function WorkflowBadge({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <Badge
      className={cn(
        "pointer-events-none ms-auto border-none bg-background bg-linear-to-r from-purple-500/8 to-pink-500/12 text-fuchsia-700 md:max-lg:absolute md:max-lg:-end-1 md:max-lg:-top-1 dark:from-purple-500/16 dark:to-pink-500/20 dark:text-fuchsia-400",
        className,
      )}
    >
      <SparklesIcon />
      <span className="md:max-lg:sr-only">Cal.ai</span>
    </Badge>
  );
}
