import { DEFAULT_THRESHOLDS, REASONS } from "@coss/risk/schemas";
import { reasonDescription } from "../components/risk-reasons";

/** The risk MDX components (`src/components/risk-reasons.tsx`) as Markdown, for /llms*.txt. */
export function renderRiskComponents(markdown: string): string {
  const table = [
    "| Code | Weight | Meaning |",
    "| --- | --- | --- |",
    ...Object.entries(REASONS).map(
      ([code, reason]) =>
        `| \`${code}\` | ${reason.weight} | ${reasonDescription(code, reason.description)} |`,
    ),
  ].join("\n");
  return markdown
    .replaceAll("<RiskReasonTable />", table)
    .replace(/<RiskThreshold of="(review|block)" \/>/g, (_, of: "review" | "block") =>
      String(DEFAULT_THRESHOLDS[of]),
    );
}
