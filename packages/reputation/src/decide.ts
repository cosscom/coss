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
 */
export function decide(
  current: { status: ReputationStatus; reason: string | null },
  results: CheckResult[],
): AutomaticTransition | null {
  if (current.status === "suspended") return null;
  const worst = worstResult(results);
  if (worst?.severity === "suspend") {
    return { to: "suspended", type: "suspended", trigger: worst.trigger };
  }
  if (worst?.severity === "warning") {
    return current.status === "good"
      ? { to: "warning", type: "warning_raised", trigger: worst.trigger }
      : null;
  }
  return current.status === "warning"
    ? { to: "good", type: "warning_cleared", trigger: current.reason ?? "evaluation" }
    : null;
}
