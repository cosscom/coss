import { Badge } from "@coss/ui/components/badge";
import { SparklesIcon } from "lucide-react";

export function WorkflowBadge() {
  return (
    <Badge className="md:max-lg:-end-1 md:max-lg:-top-1 ms-auto border-none bg-background bg-linear-to-r from-purple-500/8 to-pink-500/12 text-fuchsia-700 md:max-lg:absolute dark:from-purple-500/16 dark:to-pink-500/20 dark:text-fuchsia-400">
      <SparklesIcon />
      <span className="md:max-lg:sr-only">Cal.ai</span>
    </Badge>
  );
}
