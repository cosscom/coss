import type { DomainDeps, EmailService } from "@coss/email";
import type { WebhookManagementDeps } from "@coss/webhooks";
import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { errorResponse, internalError, notFound, payloadTooLarge, toApiError } from "./errors.ts";
import { requestId } from "./middleware/request-id.ts";
import { createV1Router } from "./routes/v1.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";
import type { AppEnv } from "./types.ts";
import { validationHook } from "./validation.ts";

export const BODY_LIMIT_BYTES = 5 * 1024 * 1024;

export type CreateAppOptions = {
  /** Defaults to the fake provider for both live and sandbox environments. */
  emailService?: EmailService;
  /** Identity provider and DNS resolver for domain management. Defaults to the fake provider. */
  domainDeps?: DomainDeps;
  /**
   * Encrypts webhook endpoint signing secrets (`WEBHOOK_SECRETS_KEY`). Required: a throwaway key
   * would silently make the endpoints it creates undeliverable.
   */
  webhookDeps: WebhookManagementDeps;
  /** Public origin advertised in the OpenAPI document (`API_PUBLIC_URL`). */
  publicUrl?: string;
};

/**
 * Builds the public API. Free of side effects (no env validation, no server), so tests can
 * create as many instances as they need and call `app.request()`.
 */
export function createApp(opts: CreateAppOptions) {
  // Cheap (two in-memory fakes), and only used for whichever dependency was not injected.
  const fallback = createDefaultEmailRuntime();
  const emailService = opts.emailService ?? fallback.emailService;
  const domainDeps = opts.domainDeps ?? fallback.domainDeps;
  // Sub-routers inherit this hook: every validation failure becomes the 422 envelope.
  const app = new OpenAPIHono<AppEnv>({ defaultHook: validationHook });

  app.use(requestId);
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

  app.route("/v1", createV1Router({ emailService, domainDeps, webhookDeps: opts.webhookDeps }));

  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    description:
      "A secret API key from the dashboard: `coss_live_…` for production environments, " +
      "`coss_test_…` for sandbox environments.",
  });

  app.doc31("/openapi.json", (c) => ({
    openapi: "3.1.0",
    info: {
      title: "COSS API",
      version: "v1",
      description:
        "One API key for every COSS product. Errors share one envelope: `Error`. Every request " +
        "is scoped to the environment the key belongs to; domains are organization-wide.",
    },
    // The origin this document was served from, so local and deployed copies both work.
    // Request origin is a dev/test fallback only: it is Host-header controlled and loses https
    // behind TLS-terminating proxies.
    servers: [{ url: opts.publicUrl ?? new URL(c.req.url).origin }],
  }));

  return app;
}

export type App = ReturnType<typeof createApp>;
