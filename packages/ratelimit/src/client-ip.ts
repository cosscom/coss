import { isIP } from "node:net";

export type ClientIpConfig = {
  /** `CLIENT_IP_HEADER`: unset disables per-IP limits. */
  header?: string | undefined;
  /** `TRUSTED_PROXY_COUNT`: proxies of ours that append to `x-forwarded-for`. */
  trustedProxyCount?: number;
};

export type ClientIpResolver = (headers: Headers) => string | null;

/**
 * The caller's address from the header our load balancer sets. With `x-forwarded-for` only the
 * entry our outermost proxy appended is trusted: everything to its left is client-controlled.
 * Returns `null` (no per-IP limit) when unconfigured or when the value is not an IP address.
 */
export function clientIpResolver(config: ClientIpConfig): ClientIpResolver {
  const header = config.header?.trim().toLowerCase();
  const hops = config.trustedProxyCount ?? 1;
  if (!header) return () => null;
  return (headers) => {
    const value = headers.get(header);
    if (!value) return null;
    let candidate = value.trim();
    if (header === "x-forwarded-for") {
      const entries = value.split(",").map((entry) => entry.trim());
      candidate = entries[entries.length - hops] ?? "";
    }
    return isIP(candidate) ? candidate : null;
  };
}
