import type { EmailService } from "@coss/email";
import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { createDefaultEmailService } from "./email-service.ts";
import { errorResponse, internalError, notFound, payloadTooLarge, toApiError } from "./errors.ts";
import { requestId } from "./middleware/request-id.ts";
import { createV1Router } from "./routes/v1.ts";
import type { AppEnv } from "./types.ts";
import { validationHook } from "./validation.ts";

export const BODY_LIMIT_BYTES = 5 * 1024 * 1024;

export type CreateAppOptions = {
  /** Defaults to the fake provider for both live and sandbox environments. */
  emailService?: EmailService;
  /** Public origin advertised in the OpenAPI document (`API_PUBLIC_URL`). */
  publicUrl?: string;
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
export function createApp(opts: CreateAppOptions = {}) {
  const emailService = opts.emailService ?? createDefaultEmailService();
  // Sub-routers inherit this hook: every validation failure becomes the 422 envelope.
  const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook });

  app.use(requestId);
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
  app.use(secureHeaders());
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

  app.route("/v1", createV1Router({ emailService }));

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
      description: "One API key for every COSS product. Errors share one envelope: `Error`.",
    },
    servers: [{ url: serverUrl }],
    tags: [{ name: "Emails", description: "Send transactional email and follow its delivery." }],
  };
}

export type App = ReturnType<typeof createApp>;
