import { formatRetentionPeriod, RETENTION_POLICY } from "@coss/retention";
import { DocsTable, DocsTd, DocsTh, DocsTr } from "./docs-table";

/** The published retention policy as a table (from `@coss/retention`, which the worker enforces). */
export function RetentionTable() {
  return (
    <DocsTable>
      <thead>
        <DocsTr>
          <DocsTh>Data</DocsTh>
          <DocsTh>Kept</DocsTh>
          <DocsTh>Details</DocsTh>
        </DocsTr>
      </thead>
      <tbody>
        {RETENTION_POLICY.map((rule) => (
          <DocsTr key={rule.id} id={`retention-${rule.id}`}>
            <DocsTd>{rule.label}</DocsTd>
            <DocsTd className="whitespace-nowrap">{formatRetentionPeriod(rule.period)}</DocsTd>
            <DocsTd>{rule.description}</DocsTd>
          </DocsTr>
        ))}
      </tbody>
    </DocsTable>
  );
}

/** One rule's period in running text, lowercased: "45 days", "until you delete it". */
export function RetentionPeriod({ of }: { of: string }) {
  const rule = RETENTION_POLICY.find((candidate) => candidate.id === of);
  if (!rule) throw new Error(`No retention rule "${of}".`);
  const text = formatRetentionPeriod(rule.period);
  return <>{"until" in rule.period ? text.toLowerCase() : text}</>;
}
