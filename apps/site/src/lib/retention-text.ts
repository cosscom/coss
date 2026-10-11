import { formatRetentionPeriod, RETENTION_POLICY } from "@coss/retention";

/** The retention MDX components (`src/components/retention.tsx`) as Markdown, for /llms*.txt. */
export function renderRetentionComponents(markdown: string): string {
  const table = [
    "| Data | Kept | Details |",
    "| --- | --- | --- |",
    ...RETENTION_POLICY.map(
      (rule) => `| ${rule.label} | ${formatRetentionPeriod(rule.period)} | ${rule.description} |`,
    ),
  ].join("\n");
  return markdown
    .replaceAll("<RetentionTable />", table)
    .replace(/<RetentionPeriod of="([a-z_]+)" \/>/g, (_, id: string) => {
      const rule = RETENTION_POLICY.find((candidate) => candidate.id === id);
      if (!rule) throw new Error(`No retention rule "${id}".`);
      const text = formatRetentionPeriod(rule.period);
      return "until" in rule.period ? text.toLowerCase() : text;
    });
}
