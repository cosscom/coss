import type { DomainRecord, DomainRow } from "@coss/email";
import { Badge } from "@coss/ui/components/badge";

const DOMAIN_STATUS = {
  pending: ["warning", "Pending"],
  verified: ["success", "Verified"],
  temporary_failure: ["warning", "Temporary failure"],
  failed: ["error", "Failed"],
  deleting: ["secondary", "Deleting"],
} as const satisfies Record<DomainRow["status"], readonly [string, string]>;

export function DomainStatusBadge({ status }: { status: DomainRow["status"] }) {
  const [variant, label] = DOMAIN_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

const RECORD_STATUS = {
  verified: ["success", "Found"],
  missing: ["warning", "Not found"],
  mismatch: ["error", "Wrong value"],
  not_checked: ["secondary", "Not checked"],
} as const satisfies Record<DomainRecord["status"], readonly [string, string]>;

export function RecordStatusBadge({ status }: { status: DomainRecord["status"] }) {
  const [variant, label] = RECORD_STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
