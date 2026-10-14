/**
 * Endpoint health: an endpoint whose deliveries have failed continuously for `disableAfterMs` is
 * turned off. `failing_since` is set by the first delivery that fails every attempt and cleared by any
 * success; a delivery that fails for good while it is older than the threshold disables the endpoint.
 * Adapters write it conditionally (only when it changes), so a healthy endpoint is never written per
 * delivery.
 */
import { DAY } from "./time.ts";

export const DISABLE_FAILING_ENDPOINT_AFTER_MS = 5 * DAY;

export type EndpointHealthChange =
  /** The endpoint recovered: clear `failing_since` (when set). */
  | { kind: "recovered" }
  /** The endpoint started failing: set `failing_since` (when not set). */
  | { kind: "failing"; since: Date }
  /** Failing for long enough: disable it. */
  | { kind: "disable"; failingSince: Date }
  | { kind: "none" };

/**
 * What a finished delivery means for its endpoint. `final` is whether the delivery is done
 * (succeeded, or failed every attempt); retries in between change nothing.
 */
export function endpointHealth(input: {
  failingSince: Date | null;
  succeeded: boolean;
  final: boolean;
  now: Date;
  disableAfterMs?: number;
}): EndpointHealthChange {
  if (input.succeeded) return input.failingSince ? { kind: "recovered" } : { kind: "none" };
  if (!input.final) return { kind: "none" };
  if (!input.failingSince) return { kind: "failing", since: input.now };
  const threshold = input.disableAfterMs ?? DISABLE_FAILING_ENDPOINT_AFTER_MS;
  return input.now.getTime() - input.failingSince.getTime() >= threshold
    ? { kind: "disable", failingSince: input.failingSince }
    : { kind: "none" };
}
