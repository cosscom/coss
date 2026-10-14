import {
  DEFAULT_THRESHOLDS,
  REASONS,
  RULE_FIELDS,
  RULE_OPERATORS,
  VELOCITY_RULES,
} from "@coss/risk/schemas";
import { DocsTable, DocsTd, DocsTh, DocsTr } from "./docs-table";

/** Every reason an assessment can give, with its weight (from `@coss/risk/schemas`). */
export function RiskReasonTable() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Code</DocsTh>
          <DocsTh>Weight</DocsTh>
          <DocsTh>Meaning</DocsTh>
        </DocsTr>
      </thead>
      <tbody>
        {Object.entries(REASONS).map(([code, reason]) => (
          <DocsTr key={code} id={`reason-${code.replaceAll(".", "-")}`}>
            <DocsTd className="whitespace-nowrap">
              <code>{code}</code>
            </DocsTd>
            <DocsTd>{reason.weight}</DocsTd>
            <DocsTd>{reasonDescription(code, reason.description)}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}

/** Every field a rule condition can test, with its operators (from `@coss/risk/schemas`). */
export function RiskRuleFieldTable() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Field</DocsTh>
          <DocsTh>Type</DocsTh>
          <DocsTh>Operators</DocsTh>
          <DocsTh>Meaning</DocsTh>
        </DocsTr>
      </thead>
      <tbody>
        {Object.entries(RULE_FIELDS).map(([field, definition]) => (
          <DocsTr key={field} id={`field-${field.replaceAll(".", "-")}`}>
            <DocsTd className="whitespace-nowrap">
              <code>{field}</code>
            </DocsTd>
            <DocsTd>{definition.type}</DocsTd>
            <DocsTd>{RULE_OPERATORS[definition.type].join(", ")}</DocsTd>
            <DocsTd>{definition.label}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}

/** A velocity reason's description gains its threshold ("at 5 or more"). */
export function reasonDescription(code: string, description: string): string {
  const rule = VELOCITY_RULES.find((candidate) => candidate.code === code);
  return rule ? `${description} Fires at ${rule.threshold} or more.` : description;
}

/** The default decision thresholds in running text. */
export function RiskThreshold({ of }: { of: "review" | "block" }) {
  return <>{DEFAULT_THRESHOLDS[of]}</>;
}
