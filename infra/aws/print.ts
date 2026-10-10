/**
 * Prints the deployment spec as JSON for whoever provisions AWS:
 *   bun run --cwd infra aws:spec
 * Placeholders like <origin-verify-secret> are filled in at provisioning time.
 */
import {
  ALB_IDLE_TIMEOUT_SECONDS,
  albListenerRules,
  cossComCacheBehaviours,
  NEXT_CACHE_KEY_HEADERS,
  ORIGIN_VERIFY_HEADER,
  ORIGIN_VERIFY_PLACEHOLDER,
} from "./routing.ts";
import { ONE_OFF_TASKS, SERVICES } from "./services.ts";

const spec = {
  services: SERVICES,
  oneOffTasks: ONE_OFF_TASKS,
  alb: {
    idleTimeoutSeconds: ALB_IDLE_TIMEOUT_SECONDS,
    httpsListener: {
      defaultAction: { Type: "fixed-response", FixedResponseConfig: { StatusCode: "403" } },
      rules: albListenerRules(),
    },
  },
  cloudFront: {
    originCustomHeader: {
      HeaderName: ORIGIN_VERIFY_HEADER,
      HeaderValue: ORIGIN_VERIFY_PLACEHOLDER,
    },
    originRequestPolicy: "Managed-AllViewer",
    cachePolicies: {
      default: "Managed-CachingDisabled",
      "coss-origin-cache-control": {
        MinTTL: 0,
        DefaultTTL: 0,
        MaxTTL: 31_536_000,
        headers: NEXT_CACHE_KEY_HEADERS,
        queryStrings: "all",
        cookies: "none",
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      },
    },
    distributions: {
      "coss.com": { cachedBehaviours: cossComCacheBehaviours() },
      "api.coss.com": { cachedBehaviours: [] },
    },
    invalidateAfterSiteDeploy: ["/*"],
  },
};

console.log(JSON.stringify(spec, null, 2));
