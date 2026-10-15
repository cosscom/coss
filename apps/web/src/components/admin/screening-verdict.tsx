import type { ScreeningVerdict } from "@coss/screening";
import { Badge } from "@coss/ui/components/badge";

/** A content screening verdict; "(shadow)" when a block or flag wasn't enforced. */
export function ScreeningVerdictBadge(props: { verdict: ScreeningVerdict; enforced: boolean }) {
  const shadow = props.enforced ? "" : " (shadow)";
  if (props.verdict === "blocked") return <Badge variant="error">blocked{shadow}</Badge>;
  if (props.verdict === "flagged") return <Badge variant="warning">flagged{shadow}</Badge>;
  if (props.verdict === "error") return <Badge variant="outline">error</Badge>;
  return <Badge variant="success">clean</Badge>;
}
