import type { CheckResult } from "./checks.ts";
import type { CheckSeverity, ReputationStatus } from "./schemas.ts";

export type AutomaticTransition = {
  to: ReputationStatus;
  type: "warning_raised" | "warning_cleared" | "suspended";
  trigger: string;
};

const RANK: Record<CheckSeverity, number> = { ok: 0, warning: 1, suspend: 2 };

/** The most severe result (the first one on ties); `null` without results. */
export function worstResult(results: CheckResult[]): CheckResult | null {
  let worst: CheckResult | null = null;
  for (const result of results) {
    if (!worst || RANK[result.severity] > RANK[worst.severity]) worst = result;
  }
  return worst;
}

/**
 * What the guard does on its own given the checks' results. A suspension is never lifted
 * automatically (only an admin reinstates), and a warning clears once every check is `ok`.
 * With `canSuspend: false` (coss.com's own organization) a `suspend` result only warns.
 */
export function decide(
  current: { status: ReputationStatus; reason: string | null },
  results: CheckResult[],
  opts: { canSuspend?: boolean } = {},
): AutomaticTransition | null {
  if (current.status === "suspended") return null;
  const worst = worstResult(results);
  if (worst?.severity === "suspend" && opts.canSuspend !== false) {
    return { to: "suspended", type: "suspended", trigger: worst.trigger };
  }
  if (worst?.severity === "warning" || worst?.severity === "suspend") {
    return current.status === "good"
      ? { to: "warning", type: "warning_raised", trigger: worst.trigger }
      : null;
  }
  return current.status === "warning"
    ? { to: "good", type: "warning_cleared", trigger: current.reason ?? "evaluation" }
    : null;
}

/**
 * Whether the marketing checks pause the marketing stream: on any `suspend` result while it is
 * active. A pause is never lifted automatically (only an admin reinstates marketing), and coss.com's
 * own organization (`canPause: false`) is never paused.
 */
export function decideMarketing(
  current: { paused: boolean },
  results: CheckResult[],
  opts: { canPause?: boolean } = {},
): { trigger: string } | null {
  if (current.paused || opts.canPause === false) return null;
  const worst = worstResult(results);
  return worst?.severity === "suspend" ? { trigger: worst.trigger } : null;
}
