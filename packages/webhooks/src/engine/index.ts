/**
 * The delivery engine shared by coss.com's own webhooks, log drains and Hooks: holds, lease fencing,
 * retry schedules, the HTTP attempt, endpoint health and a bounded runner. Each product keeps its
 * own tables and SQL; these are the parts that don't depend on either.
 */
export { type AttemptResult, describeError, sendAttempt } from "./attempt.ts";
export {
  DISABLE_FAILING_ENDPOINT_AFTER_MS,
  type EndpointHealthChange,
  endpointHealth,
} from "./health.ts";
export { organizationNotHeld } from "./holds.ts";
export { LEASE_MS, leaseUntil, stillOwned } from "./lease.ts";
export { type DeliveryOutcome, deliveryOutcome, type RetrySchedule } from "./retry.ts";
export { runClaimed } from "./runner.ts";
export { DAY, HOUR, MINUTE, SECOND } from "./time.ts";
