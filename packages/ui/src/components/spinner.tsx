import { Loader2Icon } from "lucide-react";

import { cn } from "@coss/ui/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      aria-label="Loading"
      className={cn("size-5 animate-spin sm:size-4", className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
