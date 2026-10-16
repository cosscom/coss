import { Badge } from "@coss/ui/components/badge";
import { StatusDot } from "./status-dot";

/** The slugs every marketing form sends (actions derive the organization themselves). */
export type MarketingFormTarget = { orgSlug: string; projectSlug: string; envSlug: string };

export function TargetInputs(props: MarketingFormTarget) {
  return (
    <>
      <input name="orgSlug" type="hidden" value={props.orgSlug} />
      <input name="projectSlug" type="hidden" value={props.projectSlug} />
      <input name="envSlug" type="hidden" value={props.envSlug} />
    </>
  );
}

const STATUS = {
  subscribed: { tone: "success", label: "Subscribed" },
  unsubscribed: { tone: "neutral", label: "Unsubscribed" },
  pending: { tone: "warning", label: "Pending" },
} as const;

export function ContactStatusBadge({ status }: { status: keyof typeof STATUS }) {
  const { tone, label } = STATUS[status];
  return (
    <Badge variant="outline">
      <StatusDot tone={tone}>{label}</StatusDot>
    </Badge>
  );
}
