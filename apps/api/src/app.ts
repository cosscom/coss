import type { PlanGate } from "@coss/billing/gate";
import type { DomainDeps, EmailService } from "@coss/email";
import type { InboundRuntime } from "@coss/email/runtime";
import { type LogWriter, noopLogWriter } from "@coss/logs";
import {
  type ClientIpResolver,
  createRateLimiter,
  MemoryStore,
  type RateLimiter,
} from "@coss/ratelimit";
import type { RiskDeps } from "@coss/risk";
import { versioning as apiVersioning, type Versioning } from "@coss/versioning";
import type { WebhookManagementDeps } from "@coss/webhooks";
import { OpenAPIHono } from "@hono/zod-openapi";
import { honoMiddleware } from "@sentry/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { BODY_LIMIT_BYTES, hasOwnBodyLimit, limitBody } from "./body-limit.ts";
import { errorResponse, internalError, notFound, toApiError } from "./errors.ts";
import { apiVersion } from "./middleware/api-version.ts";
import { requestId } from "./middleware/request-id.ts";
import { requestLog } from "./middleware/request-log.ts";
import { withApiVersionDocs } from "./openapi-versions.ts";
import { createTrackingRoutes, TRACKING_PATH_PREFIX } from "./routes/tracking.ts";
import { createV1Router } from "./routes/v1.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";
import type { AppEnv } from "./types.ts";
import { validationHook } from "./validation.ts";

export type CreateAppOptions = {
  /** Sends store the email and enqueue its dispatch (`createEmailService`). */
  emailService: EmailService;
  /** Identity provider and DNS resolver for domain management. Defaults to the fake provider. */
  domainDeps?: DomainDeps;
  /**
   * Receiving (`EmailRuntime.inbound`): the content store and managed domain. Defaults to the
   * fake provider's; `null` turns the receiving endpoints off (`receiving_unavailable`).
   */
  inbound?: InboundRuntime | null;
  /**
   * Encrypts webhook endpoint signing secrets (`WEBHOOK_SECRETS_KEY`). Required: a throwaway key
   * would silently make the endpoints it creates undeliverable.
   */
  webhookDeps: WebhookManagementDeps;
  /**
   * Risk assessments: the identifier hasher (`RISK_HASH_KEY`), IP datasets, velocity counters and
   * DNS. Required for the same reason: a throwaway hash key would silently reset what each
   * environment remembers.
   */
  riskDeps: RiskDeps;
  /**
   * Public origin advertised in the OpenAPI document (`API_PUBLIC_URL`).
   */
  publicUrl?: string;
  /**
   * Where Hooks portal session links point (`PORTAL_PUBLIC_URL`). Defaults to the local portal;
   * `null` (not deployed) makes creating a portal session fail with 503.
   */
  portalUrl?: string | null;
  /** Defaults to in-memory counters (one per app), which only suit tests and a single process. */
  rateLimiter?: RateLimiter;
  /** Plan features and limits (`createPlanGate` from `@coss/billing`). Defaults to none (no limits). */
  plans?: PlanGate;
  /** The caller's address for per-IP limits (`CLIENT_IP_HEADER`). Defaults to none. */
  clientIp?: ClientIpResolver;

  /**
   * Browser origins allowed to call `/v1/*` (`API_CORS_ORIGINS`): the docs' API playground. None by
   * default. Never with credentials: the API authenticates with bearer keys only, never cookies.
   */
  corsOrigins?: readonly string[];
  /**
   * Receives an `api.request` log line per attributable `/v1` request (`createLogWriter`, which
   * buffers and fails open). Defaults to writing nothing.
   */
  logWriter?: LogWriter;
  /** The API's versions (`@coss/versioning`). Tests inject `testVersioning()`. */
  versioning?: Versioning;
};

/** Request headers a browser may send, and response headers it may read, cross-origin. */
const CORS_ALLOW_HEADERS = ["Authorization", "Content-Type", "Idempotency-Key", "Coss-Version"];
const CORS_EXPOSE_HEADERS = ["X-Request-Id", "Idempotent-Replayed", "Retry-After", "Coss-Version"];

/**
 * Builds the public API. Free of side effects (no env validation, no server), so tests can
 * create as many instances as they need and call `app.request()`.
 */
export function createApp(opts: CreateAppOptions) {
  const { emailService } = opts;
  // Cheap (in-memory fakes), and only used when no domain or inbound dependencies were injected.
  const defaults =
    opts.domainDeps === undefined || opts.inbound === undefined
      ? createDefaultEmailRuntime()
      : null;
  const domainDeps = opts.domainDeps ?? defaults?.domainDeps;
  const inbound = opts.inbound === undefined ? (defaults?.inbound ?? null) : opts.inbound;
  if (!domainDeps) throw new Error("createApp: no domain dependencies.");
  const rateLimiter = opts.rateLimiter ?? createRateLimiter({ store: new MemoryStore() });
  const clientIp = opts.clientIp ?? (() => null);
  const versioning = opts.versioning ?? apiVersioning;
  // Sub-routers inherit this hook: every validation failure becomes the 422 envelope.
  const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook });

  // Sentry (when src/instrument.ts initialized it): names each request's transaction after its
  // route (`GET /v1/emails/:id`) and traces middleware. Unhandled errors are reported by the
  // console.error in onError (captureConsoleIntegration), so the middleware reports none itself.
  app.use(honoMiddleware(app, { shouldHandleError: () => false }));
  app.use(requestId);
  // Wraps everything after it, so it sees the final response (errors and 404s included).
  app.use(requestLog(opts.logWriter ?? noopLogWriter));
  app.use(async (c, next) => {
    c.set("rateLimiter", rateLimiter);
    c.set("plans", opts.plans ?? null);
    c.set("clientIp", clientIp(c.req.raw.headers));
    c.set("versioning", versioning);
    await next();
  });

  // Before everything else that can answer, so preflights and error responses carry the headers.
  app.use(
    "/v1/*",
    cors({
      origin: [...(opts.corsOrigins ?? [])],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowHeaders: CORS_ALLOW_HEADERS,
      exposeHeaders: CORS_EXPOSE_HEADERS,
      maxAge: 600,
      credentials: false,
    }),
  );
  app.use("/v1/*", apiVersion);
  const strictHeaders = secureHeaders();
  // Mail clients and webmail load the open pixel from other origins.
  const trackingHeaders = secureHeaders({ crossOriginResourcePolicy: "cross-origin" });
  app.use((c, next) =>
    (c.req.path.startsWith(TRACKING_PATH_PREFIX) ? trackingHeaders : strictHeaders)(c, next),
  );
  const defaultBodyLimit = limitBody(BODY_LIMIT_BYTES);
  app.use((c, next) => (hasOwnBodyLimit(c) ? next() : defaultBodyLimit(c, next)));
  if (process.env.NODE_ENV !== "test") app.use(logger());

  app.onError((error, c) => {
    const apiError = toApiError(error);
    if (apiError) return errorResponse(c, apiError);
    console.error(
      `[api] Unhandled error (request_id=${c.var.requestId}) on ${c.req.method} ${c.req.path}:`,
      error,
    );
    return errorResponse(c, internalError());
  });

  app.notFound((c) =>
    errorResponse(c, notFound(`No endpoint matches ${c.req.method} ${c.req.path}.`)),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  // Public and unauthenticated (fetched by mail clients); not part of the OpenAPI document.
  app.route("/t", createTrackingRoutes());

  app.route(
    "/v1",
    createV1Router({
      emailService,
      domainDeps,
      webhookDeps: opts.webhookDeps,
      portalUrl: opts.portalUrl === undefined ? "http://localhost:3003" : opts.portalUrl,
      riskDeps: opts.riskDeps,
      inbound,
    }),
  );

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    description:
      "A secret API key from the dashboard: `coss_live_…` for production environments, " +
      "`coss_test_…` for sandbox environments.",
  });

  // The origin this document was served from, so local and deployed copies both work.
  // Request origin is a dev/test fallback only: it is Host-header controlled and loses https
  // behind TLS-terminating proxies.
  app.get("/openapi.json", (c) =>
    c.json(renderOpenApiDocument(app, opts.publicUrl ?? new URL(c.req.url).origin, versioning)),
  );

  return app;
}

/** The OpenAPI document: the routes', plus what isn't derived from them (the `Coss-Version` header). */
export function renderOpenApiDocument(
  app: OpenAPIHono<AppEnv>,
  serverUrl: string,
  versioning: Versioning = apiVersioning,
) {
  return withApiVersionDocs(app.getOpenAPI31Document(openApiDocumentConfig(serverUrl)), versioning);
}

/** Everything in the OpenAPI document that isn't derived from the routes. */
export function openApiDocumentConfig(serverUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "COSS API",
      // Replaced by the latest `Coss-Version` (`withApiVersionDocs`).
      version: "v1",
      description:
        "One API key for every COSS product. Errors share one envelope: `Error`. Every request " +
        "is scoped to the environment the key belongs to; domains and the audit log are " +
        "organization-wide.",
    },
    servers: [{ url: serverUrl }],
    tags: [
      {
        name: "Environment",
        description: "The environment, project and organization an API key belongs to.",
      },
      { name: "Emails", description: "Send transactional email and follow its delivery." },
      {
        name: "Email templates",
        description:
          "Versioned, localized subjects and bodies with typed variables, sent by id or alias.",
      },
      {
        name: "Suppressions",
        description: "Addresses that sends skip, added by bounces, complaints or you.",
      },
      {
        name: "Tracking",
        description: "Which emails of the environment have their opens and clicks tracked.",
      },
      { name: "Domains", description: "The organization's verified sending domains." },
      {
        name: "Webhook endpoints",
        description: "URLs that receive the environment's delivery events, signed.",
      },
      {
        name: "Hooks applications",
        description:
          "Hooks (webhooks as a service): your customers, each with their own endpoints and portal.",
      },
      {
        name: "Hooks event types",
        description: "The catalog of messages you send, which your customers subscribe from.",
      },
      {
        name: "Hooks endpoints",
        description:
          "Your customers' URLs that receive their messages, each signed with its own secret.",
      },
      {
        name: "Hooks messages",
        description:
          "Send a message once; COSS delivers it to every subscribed endpoint, with retries.",
      },
      {
        name: "Hooks portal",
        description: "A ready-made page for your customers to manage their endpoints.",
      },
      {
        name: "Logs",
        description: "The environment's API requests, email events and webhook attempts.",
      },
      {
        name: "Audit log",
        description: "Changes to the organization, by members, API keys and COSS support.",
      },
      {
        name: "Risk",
        description:
          "Assess sign-ups, logins and other events: a decision with reasons, from signals and " +
          "what the environment remembers.",
      },
    ],
  };
}

export type App = ReturnType<typeof createApp>;
