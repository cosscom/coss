/**
 * The public error envelope. Every non-2xx response is
 * `{ "error": { type, code, message, param?, issues?, request_id } }`, built only here.
 */
import { DomainError, EmailError } from "@coss/email";
import { WebhookError } from "@coss/webhooks";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import type { AppEnv } from "./types.ts";

export const ERROR_TYPES = [
  "invalid_request_error",
  "authentication_error",
  "permission_error",
  "not_found_error",
  "idempotency_error",
  "rate_limit_error",
  "api_error",
] as const;

export type ApiErrorType = (typeof ERROR_TYPES)[number];

export type ApiErrorIssue = { path: string; message: string };

export const ErrorEnvelope = z
  .object({
    error: z.object({
      type: z.enum(ERROR_TYPES),
      code: z.string().meta({ description: "Machine-readable reason, e.g. `invalid_api_key`." }),
      message: z.string().meta({ description: "Human-readable explanation. May change." }),
      param: z
        .string()
        .optional()
        .meta({ description: "The request field or header the error relates to." }),
      issues: z
        .array(
          z.object({
            path: z.string().meta({ description: "Dot-separated field path, e.g. `to.1`." }),
            message: z.string(),
          }),
        )
        .optional()
        .meta({ description: "Every validation problem (`validation_error` only)." }),
      request_id: z.string().meta({ examples: ["req_01k7c8m4q2f3e9v6t5r1n0p8yz"] }),
    }),
  })
  .meta({ id: "Error" });

export type ErrorEnvelopeBody = z.output<typeof ErrorEnvelope>;

type ApiErrorDetails = {
  type: ApiErrorType;
  code: string;
  message: string;
  param?: string;
  issues?: ApiErrorIssue[];
};

/** An expected failure with a public envelope. Throw it anywhere; `app.onError` renders it. */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly type: ApiErrorType;
  readonly code: string;
  readonly param?: string;
  readonly issues?: ApiErrorIssue[];
  readonly headers?: Record<string, string>;

  constructor(
    status: ContentfulStatusCode,
    details: ApiErrorDetails,
    headers?: Record<string, string>,
  ) {
    super(details.message);
    this.name = "ApiError";
    this.status = status;
    this.type = details.type;
    this.code = details.code;
    this.param = details.param;
    this.issues = details.issues;
    this.headers = headers;
  }
}

export function errorResponse(c: Context<AppEnv>, error: ApiError): Response {
  const body: ErrorEnvelopeBody = {
    error: {
      type: error.type,
      code: error.code,
      message: error.message,
      ...(error.param !== undefined && { param: error.param }),
      ...(error.issues !== undefined && { issues: error.issues }),
      request_id: c.var.requestId,
    },
  };
  return c.json(body, error.status, error.headers);
}

// Hono's JSON validator throws `HTTPException(400, "Malformed JSON in request body")`.
const MALFORMED_JSON = /malformed json/i;

// Keeps the documented type <-> status pairing for exceptions thrown by Hono or its middleware.
const TYPE_BY_STATUS: Partial<Record<number, ApiErrorType>> = {
  401: "authentication_error",
  403: "permission_error",
  404: "not_found_error",
  429: "rate_limit_error",
};

function fromHttpException(error: HTTPException): ApiError {
  const { status } = error;
  if (status === 400 && MALFORMED_JSON.test(error.message)) {
    return new ApiError(400, {
      type: "invalid_request_error",
      code: "invalid_json",
      message: "The request body is not valid JSON.",
    });
  }
  if (status === 413) return payloadTooLarge();
  if (status === 415) {
    // Thrown by @hono/zod-openapi when Content-Type does not match the route's declared body.
    return new ApiError(415, {
      type: "invalid_request_error",
      code: "unsupported_media_type",
      message: "Send the request body as JSON with `Content-Type: application/json`.",
    });
  }
  return new ApiError(status, {
    type: TYPE_BY_STATUS[status] ?? "invalid_request_error",
    code: "invalid_request",
    message: error.message || "The request could not be processed.",
  });
}

function fromEmailError(error: EmailError): ApiError {
  switch (error.code) {
    case "request_in_progress":
      // Concurrent requests keep taking over the key; the SDK retries after Retry-After.
      return new ApiError(
        error.status,
        { type: "idempotency_error", code: error.code, message: error.message },
        { "Retry-After": "1" },
      );
    case "idempotency_key_reused":
      return new ApiError(error.status, {
        type: "idempotency_error",
        code: error.code,
        message: error.message,
        param: "Idempotency-Key",
      });
    case "not_found":
      return new ApiError(error.status, {
        type: "not_found_error",
        code: error.code,
        message: error.message,
      });
    case "domain_not_verified":
      return new ApiError(error.status, {
        type: "invalid_request_error",
        code: error.code,
        message: error.message,
        param: error.param ?? "from",
      });
    case "sending_paused":
    case "account_suspended":
      return new ApiError(error.status, {
        type: "permission_error",
        code: error.code,
        message: error.message,
      });
    case "email_not_cancelable":
    case "email_not_reschedulable":
      return invalidRequest(error.code, error.message);
  }
}

function invalidRequest(code: string, message: string, param?: string): ApiError {
  return new ApiError(422, {
    type: "invalid_request_error",
    code,
    message,
    ...(param && { param }),
  });
}

function fromDomainError(error: DomainError): ApiError {
  switch (error.code) {
    case "invalid_domain":
      return invalidRequest(error.code, error.message, "name");
    case "domain_taken":
      // Not a 409: the SDK retries those, and a claimed name does not free up on its own.
      return invalidRequest(error.code, error.message, "name");
    case "too_many_pending_domains":
    case "tracking_domain_exists":
      return invalidRequest(error.code, error.message);
    case "invalid_tracking_hostname":
    case "tracking_domain_taken":
      return invalidRequest(error.code, error.message, "hostname");
    case "not_found":
      return new ApiError(404, {
        type: "not_found_error",
        code: error.code,
        message: error.message,
      });
    case "provider_error":
      // The delivery provider, not the caller, is at fault: retryable.
      return new ApiError(502, { type: "api_error", code: error.code, message: error.message });
  }
}

function fromWebhookError(error: WebhookError): ApiError {
  switch (error.code) {
    case "invalid_url":
      return invalidRequest(error.code, error.message, "url");
    case "invalid_api_version":
      return invalidRequest(error.code, error.message, "api_version");
    case "too_many_endpoints":
      return invalidRequest(error.code, error.message);
    case "not_found":
      return new ApiError(404, {
        type: "not_found_error",
        code: error.code,
        message: error.message,
      });
  }
}

/** Maps known error classes to their envelope; `null` means unexpected (a bug or an outage). */
export function toApiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error;
  if (error instanceof EmailError) return fromEmailError(error);
  if (error instanceof DomainError) return fromDomainError(error);
  if (error instanceof WebhookError) return fromWebhookError(error);
  // A 5xx exception is a server fault: left to the caller to log and answer with a generic 500.
  if (error instanceof HTTPException && error.status < 500) return fromHttpException(error);
  return null;
}

export function payloadTooLarge(limitBytes?: number): ApiError {
  return new ApiError(413, {
    type: "invalid_request_error",
    code: "payload_too_large",
    message:
      limitBytes === undefined
        ? "The request body is too large."
        : `The request body is larger than the ${limitBytes / 1024 / 1024} MB limit.`,
  });
}

export function internalError(): ApiError {
  return new ApiError(500, {
    type: "api_error",
    code: "internal_error",
    message:
      "Something went wrong on our end. Retry the request; if it keeps failing, contact support " +
      "with the request_id.",
  });
}

export function notFound(message: string): ApiError {
  return new ApiError(404, { type: "not_found_error", code: "not_found", message });
}
