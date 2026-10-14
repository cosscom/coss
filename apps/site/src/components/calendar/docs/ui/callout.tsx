import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { cn } from "@coss/ui/lib/utils";
import {
  CircleAlert,
  CircleCheck,
  Info,
  Lightbulb,
  type LucideIcon,
  TriangleAlert,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type CalloutType = "info" | "warn" | "warning" | "error" | "success" | "idea" | "tip";

type Kind = { variant: ComponentProps<typeof Alert>["variant"]; label: string; icon: LucideIcon };

const NOTE: Kind = { variant: "default", label: "Note", icon: Info };
const TIP: Kind = { variant: "info", label: "Tip", icon: Lightbulb };
const WARNING: Kind = { variant: "warning", label: "Warning", icon: TriangleAlert };

const KINDS: Record<CalloutType, Kind> = {
  info: NOTE,
  tip: TIP,
  idea: TIP,
  warn: WARNING,
  warning: WARNING,
  error: { variant: "error", label: "Error", icon: CircleAlert },
  success: { variant: "success", label: "Done", icon: CircleCheck },
};

export function Callout({
  type = "info",
  title,
  className,
  children,
  ...rest
}: Omit<ComponentProps<"div">, "title"> & {
  type?: CalloutType;
  title?: ReactNode;
  icon?: ReactNode;
}) {
  const props = { ...rest };
  delete props.icon;
  const kind = KINDS[type] ?? NOTE;
  const Icon = kind.icon;
  return (
    <Alert
      role="note"
      data-callout={type}
      variant={kind.variant}
      {...props}
      className={cn("docs-callout my-6", className)}
    >
      <Icon aria-hidden />
      <AlertTitle>{title ?? kind.label}</AlertTitle>
      <AlertDescription>
        <div className="docs-prose-body">{children}</div>
      </AlertDescription>
    </Alert>
  );
}
