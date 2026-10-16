/**
 * Response headers of every hub response (set by src/proxy.ts). The hub runs on its own
 * registrable domain (hub.coss.com), so no cookie or script of coss.com reaches it. Avatars come
 * from GitHub (contributors keep their GitHub identity); everything else is same-origin.
 */
export function contentSecurityPolicy(opts: { dev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next's bootstrap scripts are inline; `next dev` evaluates modules for fast refresh.
    "script-src": ["'self'", "'unsafe-inline'", ...(opts.dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Every image is the hub's own (public/avatars, public/readme, public/video, /a/<handle>);
    // blob: is the onboarding form's avatar preview.
    "img-src": ["'self'", "data:", "blob:"],
    // The front page frames a project page of the hub itself as the product demo, and the
    // click-to-play YouTube embed frames the privacy-enhanced player once pressed.
    "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(opts.dev ? ["ws:"] : [])],
    // The front page frames a project page of the hub itself as the product demo.
    "frame-ancestors": ["'self'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    ...(opts.dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityHeaders(opts: { dev: boolean }): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(opts),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
