/**
 * The plug-in point of the guard. A check measures one signal for an organization and says how
 * bad it is; the guard combines every check's verdict (`decide`). Periodic signals (rates) are
 * checks run by the worker; one-off signals (e.g. a content review of an organization's first
 * email) call `suspendOrganization` directly instead.
 */
import type { CheckSeverity, ReputationPolicy } from "./schemas.ts";

export type CheckContext = {
  organizationId: string;
  now: Date;
  /** Start of the measurement window: `windowDays` ago, but never before the last reinstatement. */
  windowStart: Date;
  policy: ReputationPolicy;
};

export type CheckResult = {
  trigger: string;
  severity: CheckSeverity;
  message: string;
  rate: number | null;
  count: number;
  volume: number;
  warningThreshold: number | null;
  suspendThreshold: number | null;
  minimumVolume: number | null;
};

/** `evaluate` receives the same `context` object as every other check of one evaluation. */
export type ReputationCheck = {
  trigger: string;
  evaluate(context: CheckContext): Promise<CheckResult>;
};

/** The verdict for a rate signal: `ok` below the minimum volume, else by threshold. */
export function rateResult(input: {
  trigger: string;
  label: string;
  count: number;
  volume: number;
  /** `suspend: null` never suspends. */
  threshold: { warning: number; suspend: number | null; minimumRecipients: number };
  /** What `volume` counts (default `recipients`). */
  unit?: string;
}): CheckResult {
  const { trigger, label, count, volume, threshold } = input;
  const unit = input.unit ?? "recipients";
  const rate = volume > 0 ? count / volume : null;
  const percent = rate === null ? "n/a" : `${(rate * 100).toFixed(2)}%`;
  let severity: CheckSeverity = "ok";
  let message = `${label} ${percent} (${count} of ${volume} ${unit}).`;
  if (volume < threshold.minimumRecipients) {
    message = `${label} ${percent}: not enough volume to act on (${volume} of the ${threshold.minimumRecipients} ${unit} needed).`;
  } else if (rate !== null && threshold.suspend !== null && rate >= threshold.suspend) {
    severity = "suspend";
    message = `${label} ${percent} is at or above the ${(threshold.suspend * 100).toFixed(2)}% suspension threshold.`;
  } else if (rate !== null && rate >= threshold.warning) {
    severity = "warning";
    message = `${label} ${percent} is at or above the ${(threshold.warning * 100).toFixed(2)}% warning threshold.`;
  }
  return {
    trigger,
    severity,
    message,
    rate,
    count,
    volume,
    warningThreshold: threshold.warning,
    suspendThreshold: threshold.suspend,
    minimumVolume: threshold.minimumRecipients,
  };
}
