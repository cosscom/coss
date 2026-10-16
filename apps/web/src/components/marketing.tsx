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

const BROADCAST_STATUS = {
  draft: { tone: "neutral", label: "Draft" },
  scheduled: { tone: "info", label: "Scheduled" },
  sending: { tone: "info", label: "Sending" },
  paused: { tone: "warning", label: "Paused" },
  sent: { tone: "success", label: "Sent" },
  canceled: { tone: "neutral", label: "Canceled" },
  failed: { tone: "error", label: "Failed" },
} as const;

export function BroadcastStatusBadge({ status }: { status: keyof typeof BROADCAST_STATUS }) {
  const { tone, label } = BROADCAST_STATUS[status];
  return (
    <Badge variant="outline">
      <StatusDot pulse={status === "sending"} tone={tone}>
        {label}
      </StatusDot>
    </Badge>
  );
}
