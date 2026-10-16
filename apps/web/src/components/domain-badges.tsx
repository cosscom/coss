import type {
  DomainBimiObjectOutput,
  DomainRecord,
  DomainRow,
  TrackingDomainRow,
} from "@coss/email";
import { Badge } from "@coss/ui/components/badge";
import { StatusDot, type StatusTone } from "./status-dot";

const DOMAIN_STATUS = {
  pending: ["warning", "Pending"],
  verified: ["success", "Verified"],
  temporary_failure: ["warning", "Temporary failure"],
  failed: ["error", "Failed"],
  deleting: ["neutral", "Deleting"],
} as const satisfies Record<DomainRow["status"], readonly [StatusTone, string]>;

export function DomainStatusBadge({ status }: { status: DomainRow["status"] }) {
  const [tone, label] = DOMAIN_STATUS[status];
  return (
    <Badge variant="outline">
      <StatusDot pulse={status === "pending"} tone={tone}>
        {label}
      </StatusDot>
    </Badge>
  );
}

/** A domain's status as a dot and label, for dense lists. */
export function DomainStatusDot({ status }: { status: DomainRow["status"] }) {
  const [tone, label] = DOMAIN_STATUS[status];
  return (
    <StatusDot pulse={status === "pending"} tone={tone}>
      {label}
    </StatusDot>
  );
}

const RECORD_STATUS = {
  verified: ["success", "Found"],
  missing: ["warning", "Not found"],
  mismatch: ["error", "Wrong value"],
  not_checked: ["neutral", "Not checked"],
} as const satisfies Record<DomainRecord["status"], readonly [StatusTone, string]>;

export function RecordStatusBadge({ status }: { status: DomainRecord["status"] }) {
  const [tone, label] = RECORD_STATUS[status];
  return <StatusDot tone={tone}>{label}</StatusDot>;
}

const TRACKING_DOMAIN_STATUS = {
  pending: ["warning", "Pending"],
  active: ["success", "Active"],
  temporary_failure: ["warning", "Temporary failure"],
  failed: ["error", "Failed"],
  deleting: ["neutral", "Removing"],
} as const satisfies Record<TrackingDomainRow["status"], readonly [StatusTone, string]>;

export function TrackingDomainStatusBadge({ status }: { status: TrackingDomainRow["status"] }) {
  const [tone, label] = TRACKING_DOMAIN_STATUS[status];
  return (
    <Badge variant="outline">
      <StatusDot pulse={status === "pending"} tone={tone}>
        {label}
      </StatusDot>
    </Badge>
  );
}

const BIMI_STATUS = {
  not_checked: ["neutral", "Not checked"],
  missing: ["neutral", "Not set up"],
  invalid: ["warning", "Needs attention"],
  configured: ["success", "Configured"],
} as const satisfies Record<DomainBimiObjectOutput["status"], readonly [StatusTone, string]>;

export function BimiStatusBadge({ status }: { status: DomainBimiObjectOutput["status"] }) {
  const [tone, label] = BIMI_STATUS[status];
  return (
    <Badge variant="outline">
      <StatusDot tone={tone}>{label}</StatusDot>
    </Badge>
  );
}
