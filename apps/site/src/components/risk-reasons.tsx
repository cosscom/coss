import { DEFAULT_THRESHOLDS, REASONS, VELOCITY_RULES } from "@coss/risk/schemas";

/** Every reason an assessment can give, with its weight (from `@coss/risk/schemas`). */
export function RiskReasonTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Weight</th>
          <th>Meaning</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(REASONS).map(([code, reason]) => (
          <tr key={code} id={`reason-${code.replaceAll(".", "-")}`}>
            <td className="whitespace-nowrap">
              <code>{code}</code>
            </td>
            <td>{reason.weight}</td>
            <td>{reasonDescription(code, reason.description)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
