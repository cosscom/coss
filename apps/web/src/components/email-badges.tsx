import type { EmailEventType, EmailObjectOutput, EmailRecipientStatus } from "@coss/email";
import type { EnvironmentMode } from "@coss/tenancy";
import { Badge } from "@coss/ui/components/badge";

const STATUS_VARIANT = {
  queued: "secondary",
  sent: "success",
  failed: "error",
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
} as const satisfies Record<EmailEventType, string>;

export function EmailEventBadge({ type }: { type: EmailEventType }) {
  return <Badge variant={EVENT_VARIANT[type]}>{type}</Badge>;
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
