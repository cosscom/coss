/** Retry schedules and the state a delivery moves to after an attempt. */

/** The wait before each retry; one more attempt than delays in all. */
export type RetrySchedule = readonly number[];

export type DeliveryOutcome = {
  status: "succeeded" | "failed" | "pending";
  attemptCount: number;
  /** Set only while another attempt is due. */
  nextAttemptAt: Date | null;
  /** The attempt was the last one and it failed. */
  exhausted: boolean;
};

/**
 * Where a delivery stands after an attempt. `random` (a `Math.random`-like source) shortens each
 * delay by up to 10% so retries of many deliveries that failed together spread out; without it the
 * schedule is exact.
 */
export function deliveryOutcome(input: {
  attemptCount: number;
  succeeded: boolean;
  schedule: RetrySchedule;
  now: Date;
  random?: () => number;
}): DeliveryOutcome {
  const attemptCount = input.attemptCount + 1;
  if (input.succeeded) {
    return { status: "succeeded", attemptCount, nextAttemptAt: null, exhausted: false };
  }
  if (attemptCount > input.schedule.length) {
    return { status: "failed", attemptCount, nextAttemptAt: null, exhausted: true };
  }
  const delay = input.schedule[attemptCount - 1] ?? 0;
  const jitter = input.random ? Math.floor(delay * 0.1 * input.random()) : 0;
  return {
    status: "pending",
    attemptCount,
    nextAttemptAt: new Date(input.now.getTime() + delay - jitter),
    exhausted: false,
  };
}
