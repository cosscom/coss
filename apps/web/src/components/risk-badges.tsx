import type { RiskDecision, RiskOutcome } from "@coss/risk/schemas";
import { Badge } from "@coss/ui/components/badge";

const DECISION_VARIANT = {
  allow: "success",
  review: "warning",
  block: "error",
} as const satisfies Record<RiskDecision, string>;

export function RiskDecisionBadge({ decision }: { decision: RiskDecision }) {
  return <Badge variant={DECISION_VARIANT[decision]}>{decision}</Badge>;
}

const OUTCOME_VARIANT = {
  legitimate: "success",
  fraud: "error",
  abuse: "error",
} as const satisfies Record<RiskOutcome, string>;

export function RiskOutcomeBadge({ outcome }: { outcome: RiskOutcome }) {
  return <Badge variant={OUTCOME_VARIANT[outcome]}>{outcome}</Badge>;
}
