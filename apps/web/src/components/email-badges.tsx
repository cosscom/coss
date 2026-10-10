import type {
  EmailEventType,
  EmailObjectOutput,
  EmailRecipientStatus,
  SuppressionReason,
} from "@coss/email";
import type { EnvironmentMode } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";

const STATUS_VARIANT = {
  queued: "secondary",
  sent: "success",
  failed: "error",
  scheduled: "info",
  canceled: "outline",
} as const satisfies Record<EmailObjectOutput["status"], string>;

export function EmailStatusBadge({ status }: { status: EmailObjectOutput["status"] }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

const RECIPIENT_STATUS_VARIANT = {
  queued: "secondary",
  sent: "info",
  delivery_delayed: "warning",
  delivered: "success",
  bounced: "error",
  suppressed: "error",
  complained: "error",
  failed: "error",
  canceled: "outline",
} as const satisfies Record<EmailRecipientStatus, string>;

export function RecipientStatusBadge({ status }: { status: EmailRecipientStatus }) {
  return <Badge variant={RECIPIENT_STATUS_VARIANT[status]}>{status.replaceAll("_", " ")}</Badge>;
}

const EVENT_VARIANT = {
  "email.sent": "info",
  "email.delivered": "success",
  "email.delivery_delayed": "warning",
  "email.bounced": "error",
  "email.complained": "error",
  "email.failed": "error",
  "email.suppressed": "warning",
  "email.scheduled": "info",
  "email.canceled": "outline",
  "email.opened": "secondary",
  "email.clicked": "secondary",
} as const satisfies Record<EmailEventType, string>;

export function EmailEventBadge({ type }: { type: EmailEventType }) {
  return <Badge variant={EVENT_VARIANT[type]}>{type}</Badge>;
}

const SUPPRESSION_REASON_VARIANT = {
  bounce: "error",
  complaint: "error",
  manual: "secondary",
  import: "secondary",
} as const satisfies Record<SuppressionReason, string>;

export function SuppressionReasonBadge({ reason }: { reason: SuppressionReason }) {
  return <Badge variant={SUPPRESSION_REASON_VARIANT[reason]}>{reason}</Badge>;
}

/** `*` reads as "All emails"; anything else is a category. */
export function SuppressionScopeBadge({ scope }: { scope: string }) {
  return scope === "*" ? (
    <Badge variant="outline">All emails</Badge>
  ) : (
    <Badge className="font-mono" variant="secondary">
      {scope}
    </Badge>
  );
}

export function SandboxBadge({ sandbox }: { sandbox: boolean }) {
  return sandbox ? <Badge variant="info">sandbox</Badge> : <Badge variant="outline">live</Badge>;
}

export function ModeBadge({ mode }: { mode: EnvironmentMode }) {
  return mode === "live" ? (
    <Badge variant="warning">Live</Badge>
  ) : (
    <Badge variant="info">Sandbox</Badge>
  );
}

/** Whether a kind of tracking is on: for settings and for a sent email. */
export function TrackingBadge({ on }: { on: boolean }) {
  return on ? <Badge variant="success">On</Badge> : <Badge variant="outline">Off</Badge>;
}
