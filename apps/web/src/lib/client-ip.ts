/**
 * The client address from `X-Forwarded-For` when `hops` trusted proxies sit in front of the app,
 * each appending the address it received the request from. Behind CloudFront → ALB (`hops = 2`)
 * the header ends with `…, <viewer>, <CloudFront edge>`; everything further left was sent by the
 * client and is never trusted. `null` when the header is shorter than that (the request did not
 * come through every proxy) or the entry isn't an IP address.
 */
export function clientIpFromForwardedFor(header: string | null, hops: number): string | null {
  if (!header || hops < 1) return null;
  const entries = header
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const candidate = entries.length >= hops ? entries[entries.length - hops] : undefined;
  return candidate && isIpAddress(candidate) ? candidate : null;
}

/**
 * The client address for audit events: `src/proxy.ts` leaves exactly the one address the proxies
 * vouch for in `X-Forwarded-For` (or `unknown`), so anything else (a request it didn't see) is
 * none. `null` without trusted proxies.
 */
export function auditClientIp(forwarded: string | null, trustedProxyHops: number): string | null {
  if (trustedProxyHops < 1 || !forwarded) return null;
  const value = forwarded.trim();
  return isIpAddress(value) ? value : null;
}

function isIpAddress(value: string): boolean {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((octet) => Number(octet) <= 255);
  }
  // IPv6 (incl. IPv4-mapped); URL parsing validates the rest.
  if (!/^[0-9a-f:.]+$/i.test(value) || !value.includes(":")) return false;
  try {
    new URL(`http://[${value}]/`);
    return true;
  } catch {
    return false;
  }
}
