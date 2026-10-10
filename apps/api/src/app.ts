import type { DomainDeps, EmailService } from "@coss/email";
import {
  type ClientIpResolver,
  createRateLimiter,
  MemoryStore,
  type RateLimiter,
} from "@coss/ratelimit";
import type { WebhookManagementDeps } from "@coss/webhooks";
import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { errorResponse, internalError, notFound, payloadTooLarge, toApiError } from "./errors.ts";
import { requestId } from "./middleware/request-id.ts";
import { createTrackingRoutes, TRACKING_PATH_PREFIX } from "./routes/tracking.ts";
import { createV1Router } from "./routes/v1.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";
import type { AppEnv } from "./types.ts";
import { validationHook } from "./validation.ts";

export const BODY_LIMIT_BYTES = 5 * 1024 * 1024;

export type CreateAppOptions = {
  /** Sends store the email and enqueue its dispatch (`createEmailService`). */
  emailService: EmailService;
  /** Identity provider and DNS resolver for domain management. Defaults to the fake provider. */
  domainDeps?: DomainDeps;
  /**
   * Encrypts webhook endpoint signing secrets (`WEBHOOK_SECRETS_KEY`). Required: a throwaway key
   * would silently make the endpoints it creates undeliverable.
   */
  webhookDeps: WebhookManagementDeps;
  /**
   * Public origin advertised in the OpenAPI document (`API_PUBLIC_URL`).
   */
  publicUrl?: string;
  /** Defaults to in-memory counters (one per app), which only suit tests and a single process. */
  rateLimiter?: RateLimiter;
  /** The caller's address for per-IP limits (`CLIENT_IP_HEADER`). Defaults to none. */
  clientIp?: ClientIpResolver;

  /**
   * Browser origins allowed to call `/v1/*` (`API_CORS_ORIGINS`): the docs' API playground. None by
   * default. Never with credentials: the API authenticates with bearer keys only, never cookies.
   */
  corsOrigins?: readonly string[];
};

/** Request headers a browser may send, and response headers it may read, cross-origin. */
const CORS_ALLOW_HEADERS = ["Authorization", "Content-Type", "Idempotency-Key"];
const CORS_EXPOSE_HEADERS = ["X-Request-Id", "Idempotent-Replayed", "Retry-After"];

/**
 * Builds the public API. Free of side effects (no env validation, no server), so tests can
 * create as many instances as they need and call `app.request()`.
 */
export function createApp(opts: CreateAppOptions) {
  const { emailService } = opts;
  // Cheap (in-memory fakes), and only used when no domain dependencies were injected.
  const domainDeps = opts.domainDeps ?? createDefaultEmailRuntime().domainDeps;
  const rateLimiter = opts.rateLimiter ?? createRateLimiter({ store: new MemoryStore() });
  const clientIp = opts.clientIp ?? (() => null);
  // Sub-routers inherit this hook: every validation failure becomes the 422 envelope.
  const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook });

  app.use(requestId);
  app.use(async (c, next) => {
    c.set("rateLimiter", rateLimiter);
    c.set("clientIp", clientIp(c.req.raw.headers));
    await next();
  });

  // Before everything else that can answer, so preflights and error responses carry the headers.
  app.use(
    "/v1/*",
    cors({
      origin: [...(opts.corsOrigins ?? [])],
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      allowHeaders: CORS_ALLOW_HEADERS,
      exposeHeaders: CORS_EXPOSE_HEADERS,
      maxAge: 600,
      credentials: false,
    }),
  );
  const strictHeaders = secureHeaders();
  // Mail clients and webmail load the open pixel from other origins.
  const trackingHeaders = secureHeaders({ crossOriginResourcePolicy: "cross-origin" });
  app.use((c, next) =>
    (c.req.path.startsWith(TRACKING_PATH_PREFIX) ? trackingHeaders : strictHeaders)(c, next),
  );
  app.use(
    bodyLimit({
      maxSize: BODY_LIMIT_BYTES,
      onError: (c) => errorResponse(c, payloadTooLarge()),
    }),
  );
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

  app.route("/v1", createV1Router({ emailService, domainDeps, webhookDeps: opts.webhookDeps }));

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
  app.doc31("/openapi.json", (c) =>
    openApiDocumentConfig(opts.publicUrl ?? new URL(c.req.url).origin),
  );

  return app;
}

/** Everything in the OpenAPI document that isn't derived from the routes. */
export function openApiDocumentConfig(serverUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "COSS API",
      version: "v1",
      description:
        "One API key for every COSS product. Errors share one envelope: `Error`. Every request " +
        "is scoped to the environment the key belongs to; domains are organization-wide.",
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "Emails", description: "Send transactional email and follow its delivery." },
      {
        name: "Suppressions",
        description: "Addresses that sends skip, added by bounces, complaints or you.",
      },
      { name: "Domains", description: "The organization's verified sending domains." },
      {
        name: "Webhook endpoints",
        description: "URLs that receive the environment's delivery events, signed.",
      },
    ],
  };
}

export type App = ReturnType<typeof createApp>;
