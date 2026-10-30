import { DEFAULT_REPUTATION_POLICY, type RateThreshold } from "@coss/reputation/schemas";

/** One rate the reputation guard acts on, as the docs show it. */
export type ReputationThresholdRow = {
  id: string;
  signal: string;
  warning: string;
  /** What happens at the higher threshold ("Live sending suspended at 8%"). */
  action: string;
  /** Volume below which the rate is reported but never acted on. */
  minimum: string;
};

/** A rate as a percentage: 0.0008 → "0.08%". */
function percent(rate: number): string {
  return `${(rate * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function count(n: number, units: string): string {
  return `${n.toLocaleString("en-US")} ${units}`;
}

function rateRow(
  id: string,
  signal: string,
  threshold: RateThreshold,
  action: string,
  units: string,
): ReputationThresholdRow {
  return {
    id,
    signal,
    warning: percent(threshold.warning),
    action: `${action} at ${percent(threshold.suspend)}`,
    minimum: count(threshold.minimumRecipients, units),
  };
}

/** The default thresholds (`DEFAULT_REPUTATION_POLICY`, the ones the worker applies). */
export function reputationThresholdRows(): ReputationThresholdRow[] {
  const policy = DEFAULT_REPUTATION_POLICY;
  const hooks = policy.hookFailureRate;
  return [
    rateRow(
      "bounce_rate",
      "Bounce rate (permanent bounces per recipient)",
      policy.bounceRate,
      "Live sending suspended",
      "recipients",
    ),
    rateRow(
      "complaint_rate",
      "Complaint rate (spam complaints per recipient)",
      policy.complaintRate,
      "Live sending suspended",
      "recipients",
    ),
    rateRow(
      "marketing_bounce_rate",
      "Marketing bounce rate",
      policy.marketingBounceRate,
      "Marketing email paused",
      "recipients",
    ),
    rateRow(
      "marketing_complaint_rate",
      "Marketing complaint rate",
      policy.marketingComplaintRate,
      "Marketing email paused",
      "recipients",
    ),
    rateRow(
      "sms_opt_out_rate",
      "SMS opt-out rate (numbers that replied STOP per message that reached a carrier)",
      policy.smsOptOutRate,
      "Live sending suspended",
      "messages",
    ),
    rateRow(
      "sms_filtered_rate",
      "SMS carrier filtering rate (messages carriers filtered as spam)",
      policy.smsFilteredRate,
      "Live sending suspended",
      "messages",
    ),
    {
      id: "hook_failure_rate",
      signal: "Hooks deliveries that failed every attempt",
      warning: percent(hooks.warning),
      action:
        hooks.suspend === null
          ? "Never suspends"
          : `Live sending suspended at ${percent(hooks.suspend)}`,
      minimum: count(hooks.minimumDeliveries, "deliveries"),
    },
  ];
}

/** The rolling window the rates are measured over ("7 days"). */
export function reputationWindowText(): string {
  const days = DEFAULT_REPUTATION_POLICY.windowDays;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** The reputation MDX components (`src/components/reputation-thresholds.tsx`) as Markdown. */
export function renderReputationComponents(markdown: string): string {
  const table = [
    "| Signal | Warning at | Then | Minimum volume |",
    "| --- | --- | --- | --- |",
    ...reputationThresholdRows().map(
      (row) => `| ${row.signal} | ${row.warning} | ${row.action} | ${row.minimum} |`,
    ),
  ].join("\n");
  return markdown
    .replaceAll("<ReputationThresholds />", table)
    .replaceAll("<ReputationWindow />", reputationWindowText());
}
