import { Badge } from "@coss/ui/components/badge";
import { StatusDot, type StatusTone } from "../status-dot";

const TONES = {
  draft: "neutral",
  open: "warning",
  paid: "success",
  void: "neutral",
  uncollectible: "error",
} as const satisfies Record<string, StatusTone>;

export function InvoiceStatusBadge(props: {
  status: keyof typeof TONES;
  overdue?: boolean;
  paymentState?: string | null;
}) {
  const [tone, label]: [StatusTone, string] =
    props.status === "open" && props.paymentState === "processing"
      ? ["info", "Processing"]
      : props.status === "open" && props.overdue
        ? ["error", "Overdue"]
        : [TONES[props.status], props.status === "open" ? "Due" : props.status];
  return (
    <Badge className="capitalize" variant="outline">
      <StatusDot tone={tone}>{label}</StatusDot>
    </Badge>
  );
}
