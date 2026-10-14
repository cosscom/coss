import { Badge } from "@coss/ui/components/badge";

const VARIANTS = {
  draft: "outline",
  open: "warning",
  paid: "success",
  void: "secondary",
  uncollectible: "error",
} as const;

export function InvoiceStatusBadge(props: {
  status: keyof typeof VARIANTS;
  overdue?: boolean;
  paymentState?: string | null;
}) {
  if (props.status === "open" && props.paymentState === "processing") {
    return <Badge variant="info">Processing</Badge>;
  }
  if (props.status === "open" && props.overdue) return <Badge variant="error">Overdue</Badge>;
  return (
    <Badge className="capitalize" variant={VARIANTS[props.status]}>
      {props.status === "open" ? "Due" : props.status}
    </Badge>
  );
}
