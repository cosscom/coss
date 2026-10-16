import type { RiskRuleConditionOutput, RiskRuleOutput } from "@coss/risk/schemas";
import { RULE_FIELDS } from "@coss/risk/schemas";

const OPERATOR_TEXT: Record<string, string> = {
  is: "is",
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  in: "in",
  not_in: "not in",
};

function describe(condition: RiskRuleConditionOutput): string {
  const label = RULE_FIELDS[condition.field].label;
  const value = Array.isArray(condition.value)
    ? condition.value.join(", ")
    : String(condition.value);
  if (condition.operator === "is") return condition.value ? label : `not: ${label}`;
  return `${label} ${OPERATOR_TEXT[condition.operator]} ${value}`;
}

/** A rule's "When": its conditions, joined by its match mode. */
export function describeRuleConditions(rule: Pick<RiskRuleOutput, "conditions" | "match">): string {
  return rule.conditions.map(describe).join(rule.match === "all" ? " and " : " or ");
}
