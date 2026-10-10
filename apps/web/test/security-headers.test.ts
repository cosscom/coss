import { expect, test } from "bun:test";
import { clientIpFromForwardedFor } from "../src/lib/client-ip";
import { contentSecurityPolicy, securityHeaders } from "../src/lib/security-headers";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...values] = directive.split(" ");
      return [name, values];
    }),
  );
}

test("production CSP: own scripts only, never framed", () => {
  const policy = directives(contentSecurityPolicy({ dev: false }));
  expect(policy.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
  expect(policy.get("connect-src")).toEqual(["'self'"]);
  expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
  expect(policy.get("object-src")).toEqual(["'none'"]);
  expect(policy.has("upgrade-insecure-requests")).toBe(true);
  // No directive allows a third-party origin for scripts or connections.
  for (const name of ["script-src", "connect-src", "default-src"]) {
    for (const value of policy.get(name) ?? []) expect(value).not.toMatch(/^https?:|^\*$/);
  }
});

test("dev CSP allows what next dev needs, and only then", () => {
  const policy = directives(contentSecurityPolicy({ dev: true }));
  expect(policy.get("script-src")).toContain("'unsafe-eval'");
  expect(policy.has("upgrade-insecure-requests")).toBe(false);
});

test("framing is denied by header too", () => {
  expect(securityHeaders({ dev: false })).toContainEqual({ key: "X-Frame-Options", value: "DENY" });
});

test("client IP: the entry the trusted proxies appended, never a client-supplied one", () => {
  // CloudFront appends the viewer, the ALB appends CloudFront.
  expect(clientIpFromForwardedFor("203.0.113.7, 130.176.1.2", 2)).toBe("203.0.113.7");
  expect(clientIpFromForwardedFor("6.6.6.6, 203.0.113.7, 130.176.1.2", 2)).toBe("203.0.113.7");
  expect(clientIpFromForwardedFor("2001:db8::1, 130.176.1.2", 2)).toBe("2001:db8::1");
  expect(clientIpFromForwardedFor("130.176.1.2", 2)).toBeNull();
  expect(clientIpFromForwardedFor("evil, 130.176.1.2", 2)).toBeNull();
  expect(clientIpFromForwardedFor(null, 2)).toBeNull();
  expect(clientIpFromForwardedFor("203.0.113.7", 0)).toBeNull();
});
