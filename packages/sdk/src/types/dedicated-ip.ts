/** Dedicated IP wire types (hand-written mirrors of the API's `DedicatedIpPool` schema). */

export type DedicatedIpPoolStatus =
  | "not_enabled"
  | "waiting"
  | "provisioning"
  | "warming"
  | "ready"
  | "releasing";

/** `GET /v1/dedicated_ips`: the organization's dedicated IPs (the Dedicated IPs add-on). */
export interface DedicatedIpPool {
  object: "dedicated_ip_pool";
  /**
   * `warming`: live emails go through the pool while its IPs warm up (what they can't take yet
   * leaves from shared IPs); `ready`: at least 95% of the last 7 days' deliveries left from them.
   */
  status: DedicatedIpPoolStatus;
  /** The pool's IPs, with their deliveries in the last 7 days. */
  ips: { ip: string; delivered_7d: number }[];
  /** Share (0–1) of the last 7 days' deliveries from the pool's IPs; `null` below 1,000. */
  dedicated_share: number | null;
  /** What is holding the pool up, if anything. */
  message: string | null;
  created_at: string | null;
  /** When it was first `ready`. */
  ready_at: string | null;
}
