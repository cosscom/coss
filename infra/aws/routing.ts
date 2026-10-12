/**
 * coss.com's edge routing, derived from ZONE_ROUTES (@coss/auth/slugs) so a new site path can't
 * be missed: ALB listener rules pick the app, CloudFront behaviours decide caching and send the
 * coss ui repository's zones to their own origins (they run outside AWS, which an ALB can't
 * forward to).
 */
import { SITE_ASSET_PREFIX, ZONE_ROUTES, type ZoneRoute } from "@coss/auth/slugs";

export type TargetGroup = "web" | "site" | "api";

/**
 * CloudFront origins of the coss.com distribution: the ALB (every app in ECS), and one per zone
 * of the coss ui repository (Vercel projects serving their base path, `/ui` and `/origin`; their
 * hosts are set at provisioning).
 */
export type ExternalZone = "ui" | "origin";
export type Origin = "alb" | ExternalZone;
export const EXTERNAL_ZONES: readonly ExternalZone[] = ["ui", "origin"];

/**
 * External origins are addressed by their own hostname (the Vercel project's production domain),
 * so the viewer's `Host` (coss.com) must not be forwarded to them; the ALB gets everything.
 */
export const EXTERNAL_ORIGIN_REQUEST_POLICY = "Managed-AllViewerExceptHostHeader";

/** The header CloudFront adds to every origin request; the ALB forwards nothing without it. */
export const ORIGIN_VERIFY_HEADER = "X-Origin-Verify";
/** Stands in for the secret's value (Secrets Manager) in the generated rules. */
export const ORIGIN_VERIFY_PLACEHOLDER = "<origin-verify-secret>";

/** Default 60 s; the apps keep idle connections open longer (Next KEEP_ALIVE_TIMEOUT, Bun idleTimeout). */
export const ALB_IDLE_TIMEOUT_SECONDS = 60;

export const DASHBOARD_HOST = "coss.com";
export const API_HOST = "api.coss.com";

/**
 * Custom tracking domains (Cloudflare for SaaS): customers CNAME e.g. `links.acme.com` to this
 * fallback origin (a proxied record in the coss.com zone, pointing at the ALB), and Cloudflare
 * forwards their requests to the ALB with the customer's hostname as `Host`. The default for
 * `TRACKING_CNAME_TARGET`.
 */
export const TRACKING_HOST = "track.coss.com";
/** Added to every request by a Cloudflare request header transform rule (its own secret). */
export const TRACKING_ORIGIN_VERIFY_HEADER = "X-Tracking-Origin-Verify";
export const TRACKING_ORIGIN_VERIFY_PLACEHOLDER = "<tracking-origin-verify-secret>";
/** The API's open pixel and click redirect routes, the only paths custom hostnames serve. */
export const TRACKING_PATH_PATTERN = "/t/*";

/**
 * ALB limits each rule to 5 condition values (and 5 wildcards). Site rules spend up to two on the
 * origin header (old + new value while the secret rotates), which leaves 3 path patterns per rule.
 */
const PATHS_PER_RULE = 3;

/** ALB path patterns (case-sensitive, `*` wildcard) for one zone route. */
export function albPathPatterns(route: ZoneRoute): string[] {
  if (!route.prefix || route.path === "/") return [route.path];
  return [route.path, `${route.path}/*`];
}

/** One listener rule in the shape of `aws elbv2 create-rule --conditions`. */
export type ListenerRule = {
  priority: number;
  targetGroup: TargetGroup;
  conditions: (
    | { Field: "host-header"; HostHeaderConfig: { Values: string[] } }
    | { Field: "path-pattern"; PathPatternConfig: { Values: string[] } }
    | { Field: "http-header"; HttpHeaderConfig: { HttpHeaderName: string; Values: string[] } }
  )[];
};

/**
 * The HTTPS listener's rules, in priority order. The listener's default action is a fixed 403:
 * a request without CloudFront's (or, for tracking, Cloudflare's) origin header matches no rule.
 * api.coss.com goes first, so the coss.com rules don't need a host condition; then the tracking
 * routes on any host (customer tracking domains, from Cloudflare); the dashboard (default zone)
 * is last.
 */
export function albListenerRules(): ListenerRule[] {
  const verified = {
    Field: "http-header" as const,
    HttpHeaderConfig: { HttpHeaderName: ORIGIN_VERIFY_HEADER, Values: [ORIGIN_VERIFY_PLACEHOLDER] },
  };
  const rules: Omit<ListenerRule, "priority">[] = [
    {
      targetGroup: "api",
      conditions: [{ Field: "host-header", HostHeaderConfig: { Values: [API_HOST] } }, verified],
    },
    {
      targetGroup: "api",
      conditions: [
        { Field: "path-pattern", PathPatternConfig: { Values: [TRACKING_PATH_PATTERN] } },
        {
          Field: "http-header",
          HttpHeaderConfig: {
            HttpHeaderName: TRACKING_ORIGIN_VERIFY_HEADER,
            Values: [TRACKING_ORIGIN_VERIFY_PLACEHOLDER],
          },
        },
      ],
    },
  ];
  // External zones never reach the ALB: CloudFront sends them to their own origins.
  const sitePatterns = (ZONE_ROUTES as readonly ZoneRoute[])
    .filter((route) => route.zone === "site")
    .flatMap(albPathPatterns);
  for (let index = 0; index < sitePatterns.length; index += PATHS_PER_RULE) {
    rules.push({
      targetGroup: "site",
      conditions: [
        {
          Field: "path-pattern",
          PathPatternConfig: { Values: sitePatterns.slice(index, index + PATHS_PER_RULE) },
        },
        verified,
      ],
    });
  }
  rules.push({
    targetGroup: "web",
    conditions: [
      { Field: "host-header", HostHeaderConfig: { Values: [DASHBOARD_HOST] } },
      verified,
    ],
  });
  // Gaps of 10 leave room for manual rules (maintenance pages, …).
  return rules.map((rule, index) => ({ priority: (index + 1) * 10, ...rule }));
}

export type CacheBehaviour = {
  /** CloudFront path pattern. */
  pathPattern: string;
  origin: Origin;
  /** "origin": honour the origin's Cache-Control (`coss-origin-cache-control` cache policy). */
  cache: "origin";
  reason: string;
};

/**
 * Cached behaviours of the coss.com distribution. Everything else (the default `*` behaviour:
 * dashboard, `/api/auth`, the landing page `/`) is never cached. CloudFront path patterns can't
 * express "exactly /", so the landing page is served uncached; it is a cheap static page.
 */
export function cossComCacheBehaviours(): CacheBehaviour[] {
  const behaviours: CacheBehaviour[] = [
    {
      pathPattern: "/_next/static/*",
      origin: "alb",
      cache: "origin",
      reason: "The dashboard's hashed, immutable assets (also keeps old chunks during deploys).",
    },
  ];
  for (const route of ZONE_ROUTES as readonly ZoneRoute[]) {
    if (route.path === "/") continue;
    const patterns = route.prefix
      ? // The asset prefix has no page of its own.
        route.path === SITE_ASSET_PREFIX
        ? [`${route.path}/*`]
        : [route.path, `${route.path}/*`]
      : [route.path];
    for (const pathPattern of patterns) {
      behaviours.push({
        pathPattern,
        origin: route.zone === "site" ? "alb" : route.zone,
        cache: "origin",
        reason: `${route.zone} zone (${route.path})`,
      });
    }
  }
  return behaviours;
}

/**
 * Request headers that select a different Next.js response for the same URL (Next's `Vary`);
 * they must be in the cache key of every cached behaviour, along with all query strings (`_rsc`).
 */
export const NEXT_CACHE_KEY_HEADERS = [
  "RSC",
  "Next-Router-Prefetch",
  "Next-Router-State-Tree",
  "Next-Router-Segment-Prefetch",
] as const;
