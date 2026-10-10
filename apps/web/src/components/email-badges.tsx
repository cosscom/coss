import type { EmailObjectOutput } from "@coss/email";
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
