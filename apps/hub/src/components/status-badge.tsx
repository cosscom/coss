import { Badge } from "@coss/ui/components/badge";
import { cn } from "@coss/ui/lib/utils";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleSlashIcon,
  FactoryIcon,
  MessageCircleQuestionIcon,
  RocketIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { type PromptStatus, STATUS_LABELS } from "@/lib/types";

/**
 * GitHub's colours, kept: anything still open is green, what reached production (merged) is
 * purple, declined is red, failed is red too. The only hue on the hub is status.
 */
export const STATUS_STYLE: Record<
  PromptStatus,
  { icon: ComponentType<{ className?: string }>; text: string; badge: string }
> = {
  needs_context: {
    icon: MessageCircleQuestionIcon,
    text: "text-green-600 dark:text-green-400",
    badge: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  awaiting_review: {
    icon: CircleDotIcon,
    text: "text-green-600 dark:text-green-400",
    badge: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  approved: {
    icon: CheckCircle2Icon,
    text: "text-green-600 dark:text-green-400",
    badge: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  building: {
    icon: FactoryIcon,
    text: "text-green-600 dark:text-green-400",
    badge: "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  in_production: {
    icon: RocketIcon,
    text: "text-purple-600 dark:text-purple-400",
    badge: "border-purple-600/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  declined: {
    icon: CircleSlashIcon,
    text: "text-red-600 dark:text-red-400",
    badge: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  failed: {
    icon: XCircleIcon,
    text: "text-red-600 dark:text-red-400",
    badge: "border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

export function StatusBadge({
  status,
  size = "default",
  className,
}: {
  status: PromptStatus;
  size?: "default" | "lg";
  className?: string;
}) {
  const { icon: Icon, badge } = STATUS_STYLE[status];
  return (
    <Badge className={cn("gap-1.5 px-2", badge, className)} size={size} variant="outline">
      <Icon aria-hidden className="size-3.5" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function StatusIcon({ status, className }: { status: PromptStatus; className?: string }) {
  const { icon: Icon, text } = STATUS_STYLE[status];
  return <Icon aria-label={STATUS_LABELS[status]} className={cn(text, className)} />;
}
