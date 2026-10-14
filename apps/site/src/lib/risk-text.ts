import { DEFAULT_THRESHOLDS, REASONS, RULE_FIELDS, RULE_OPERATORS } from "@coss/risk/schemas";
import { reasonDescription } from "../components/risk-reasons";

/** The risk MDX components (`src/components/risk-reasons.tsx`) as Markdown, for /llms*.txt. */
export function renderRiskComponents(markdown: string): string {
  const reasons = [
    "| Code | Weight | Meaning |",
    "| --- | --- | --- |",
    ...Object.entries(REASONS).map(
      ([code, reason]) =>
        `| \`${code}\` | ${reason.weight} | ${reasonDescription(code, reason.description)} |`,
    ),
  ].join("\n");
  const fields = [
    "| Field | Type | Operators | Meaning |",
    "| --- | --- | --- | --- |",
    ...Object.entries(RULE_FIELDS).map(
      ([field, definition]) =>
        `| \`${field}\` | ${definition.type} | ${RULE_OPERATORS[definition.type].join(", ")} | ${definition.label} |`,
    ),
  ].join("\n");
  return markdown
    .replaceAll("<RiskReasonTable />", reasons)
    .replaceAll("<RiskRuleFieldTable />", fields)
    .replace(/<RiskThreshold of="(review|block)" \/>/g, (_, of: "review" | "block") =>
      String(DEFAULT_THRESHOLDS[of]),
    );
}
