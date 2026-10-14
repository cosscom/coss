import type { LogDrainSource } from "@coss/logs/schemas";

/** How each source reads in the dashboard. */
export const SOURCE_LABELS: Record<LogDrainSource, { label: string; description: string }> = {
  api: { label: "API requests", description: "Requests made with this environment's API keys." },
  email: { label: "Email events", description: "Sent, delivered, bounced, opened, clicked…" },
  webhook: { label: "Webhook attempts", description: "Every delivery attempt to your endpoints." },
  risk: { label: "Risk assessments", description: "Every assessment and the feedback on it." },
  audit: {
    label: "Audit events",
    description: "Changes to this environment: keys, endpoints, drains, suppressions…",
  },
};

export function sourcesSummary(sources: readonly LogDrainSource[]): string {
  return sources.length === 0
    ? "All sources"
    : sources.map((source) => SOURCE_LABELS[source].label).join(", ");
}
