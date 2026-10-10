/**
 * Response headers for every dashboard page (next.config.ts). The dashboard shares coss.com with
 * the site, so these also guard what the site could do to it: no framing, and no script origin
 * other than this one.
 *
 * Scripts keep 'unsafe-inline': Next inlines its bootstrap and RSC payload scripts, and nonces
 * would need the proxy to render every page dynamically. The policy still blocks every
 * third-party script origin, plugins, framing and form posts elsewhere.
 */
export function contentSecurityPolicy({ dev }: { dev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // `next dev` evaluates modules for fast refresh.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // The email preview is a srcdoc iframe, which inherits this policy: customers' emails load
    // https images and fonts (its own CSP, PREVIEW_HEAD, blocks everything else).
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https:"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    "frame-src": ["'self'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    ...(dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityHeaders({ dev }: { dev: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev }) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
