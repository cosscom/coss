import { formatRetentionPeriod, RETENTION_POLICY } from "@coss/retention";

/** The published retention policy as a table (from `@coss/retention`, which the worker enforces). */
export function RetentionTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Kept</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {RETENTION_POLICY.map((rule) => (
          <tr key={rule.id} id={`retention-${rule.id}`}>
            <td>{rule.label}</td>
            <td className="whitespace-nowrap">{formatRetentionPeriod(rule.period)}</td>
            <td>{rule.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One rule's period in running text, lowercased: "45 days", "until you delete it". */
export function RetentionPeriod({ of }: { of: string }) {
  const rule = RETENTION_POLICY.find((candidate) => candidate.id === of);
  if (!rule) throw new Error(`No retention rule "${of}".`);
  const text = formatRetentionPeriod(rule.period);
  return <>{"until" in rule.period ? text.toLowerCase() : text}</>;
}
