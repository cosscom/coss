import { Badge } from "@coss/ui/components/badge";
import type { LogDrainRow } from "@coss/webhooks";

export function DrainStatusBadge({
  drain,
}: {
  drain: Pick<LogDrainRow, "enabled" | "disabledReason">;
}) {
  if (drain.enabled) return <Badge variant="success">Enabled</Badge>;
  if (drain.disabledReason === "failing") return <Badge variant="error">Disabled: failing</Badge>;
  return <Badge variant="secondary">Disabled</Badge>;
}
