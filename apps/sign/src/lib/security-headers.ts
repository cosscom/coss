/**
 * Response headers of every signing app response (set by src/proxy.ts, per request). The app runs
 * on its own registrable domain, so no cookie or script of coss.com ever reaches it, and it sets
 * no cookies itself. The one per-request part is `frame-ancestors`: a session's page may be
 * embedded by the origins its environment allows (Sign settings), everything else by none.
 */
export function contentSecurityPolicy(opts: {
  dev: boolean;
  frameAncestors: readonly string[];
}): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next's bootstrap scripts are inline; `next dev` evaluates modules for fast refresh. pdf.js
    // compiles its image decoders to WebAssembly. Documents are drawn on canvases, never as HTML.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      ...(opts.dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Signature previews are data: URLs; pdf.js renders through blob: URLs.
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:", "blob:"],
    // pdf.js parses documents in a worker of this origin.
    "worker-src": ["'self'", "blob:"],
    "connect-src": ["'self'", ...(opts.dev ? ["ws:"] : [])],
    "frame-ancestors": opts.frameAncestors.length > 0 ? [...opts.frameAncestors] : ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    ...(opts.dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityHeaders(opts: {
  dev: boolean;
  frameAncestors: readonly string[];
}): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(opts),
    // CSP's frame-ancestors governs framing; X-Frame-Options can't express an allow-list.
    "X-Content-Type-Options": "nosniff",
    // Signing URLs carry the session id; never send them anywhere.
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  };
}
