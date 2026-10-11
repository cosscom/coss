import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { HTTPException } from "hono/http-exception";
import { BODY_LIMIT_BYTES } from "../src/app.ts";
import { toApiError } from "../src/errors.ts";
import { createTestApp, emailBody, errorOf, REQUEST_ID, sendEmail } from "./helpers.ts";

describe("X-Request-Id", () => {
  test("is a fresh server-generated id on successes, errors and 404s", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const spoofed = { "X-Request-Id": "req_client_supplied" };

    const responses = [
      await sendEmail(app, tenant.sandboxKey, emailBody(), spoofed),
      await sendEmail(app, null, emailBody(), spoofed),
      await app.request("/nope", { headers: spoofed }),
      await app.request("/health", { headers: spoofed }),
    ];

    expect(responses.map((res) => res.status)).toEqual([200, 401, 404, 200]);
    const ids = responses.map((res) => res.headers.get("x-request-id"));
    for (const id of ids) expect(id).toMatch(REQUEST_ID);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("app", () => {
  test("GET /health needs no API key", async () => {
    const { app } = createTestApp();
    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    // secureHeaders runs on every response.
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  test("unknown routes are a 404 not_found_error envelope", async () => {
    const { app } = createTestApp();
    const res = await app.request("/v1/nothing-here", { method: "POST" });

    expect(res.status).toBe(404);
    expect(await errorOf(res)).toMatchObject({ type: "not_found_error", code: "not_found" });
  });

  test("a body over 5 MB is a 413 payload_too_large envelope", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider } = createTestApp();
    const body = JSON.stringify(emailBody({ html: "x".repeat(BODY_LIMIT_BYTES) }));

    const res = await sendEmail(app, tenant.sandboxKey, body);

    expect(res.status).toBe(413);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "payload_too_large",
    });
    expect(sandboxProvider.sent).toHaveLength(0);
  });

  test("a body just under the limit gets past the limit", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const html = "x".repeat(BODY_LIMIT_BYTES - 1024);

    // Invalid on purpose, so the 5 MB body is validated but never stored.
    const res = await sendEmail(app, tenant.sandboxKey, emailBody({ html, subject: "" }));

    expect(res.status).toBe(422);
    expect((await errorOf(res)).param).toBe("subject");
  });
});

describe("GET /openapi.json", () => {
  test("is an OpenAPI 3.1 document describing every v1 endpoint", async () => {
    const { app } = createTestApp();
    const res = await app.request("http://api.test/openapi.json");

    expect(res.status).toBe(200);
    const doc = (await res.json()) as {
      openapi: string;
      info: { title: string; version: string };
      servers: { url: string }[];
      paths: Record<string, Record<string, Record<string, unknown>>>;
      components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> };
    };
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info).toMatchObject({ title: "COSS API", version: "v1" });
    expect(doc.servers).toEqual([{ url: "http://api.test" }]);
    expect(Object.keys(doc.paths).sort()).toEqual([
      "/v1/domains",
      "/v1/domains/{id}",
      "/v1/domains/{id}/verify",
      "/v1/emails",
      "/v1/emails/{id}",
      "/v1/emails/{id}/events",
      "/v1/reputation",
      "/v1/suppressions",
      "/v1/suppressions/check",
      "/v1/suppressions/{id}",
      "/v1/webhook_endpoints",
      "/v1/webhook_endpoints/{id}",
    ]);
    expect(doc.paths["/v1/emails"]?.post).toMatchObject({
      operationId: "sendEmail",
      tags: ["Emails"],
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "header", name: "Idempotency-Key", required: false }],
    });
    expect(doc.paths["/v1/emails/{id}"]?.get).toMatchObject({
      operationId: "getEmail",
      parameters: [{ in: "path", name: "id", required: true }],
    });
    expect(doc.paths["/v1/emails/{id}/events"]?.get).toMatchObject({
      operationId: "listEmailEvents",
      parameters: [{ in: "path", name: "id", required: true }],
    });
    expect(doc.paths["/v1/reputation"]?.get).toMatchObject({
      operationId: "getReputation",
      security: [{ bearerAuth: [] }],
    });
    expect(doc.paths["/v1/suppressions"]?.post).toMatchObject({ operationId: "createSuppression" });
    expect(doc.paths["/v1/suppressions"]?.get).toMatchObject({
      operationId: "listSuppressions",
      parameters: expect.arrayContaining([
        expect.objectContaining({ in: "query", name: "after", required: false }),
      ]),
    });
    expect(doc.paths["/v1/suppressions/check"]?.get).toMatchObject({
      operationId: "checkSuppression",
      parameters: expect.arrayContaining([
        expect.objectContaining({ in: "query", name: "address", required: true }),
      ]),
    });
    expect(doc.paths["/v1/suppressions/{id}"]?.get).toMatchObject({
      operationId: "getSuppression",
    });
    expect(doc.paths["/v1/suppressions/{id}"]?.delete).toMatchObject({
      operationId: "deleteSuppression",
      security: [{ bearerAuth: [] }],
    });
    // Every mutating operation of the management endpoints is documented and authenticated.
    expect(
      Object.entries(doc.paths)
        .flatMap(([path, methods]) =>
          Object.entries(methods).map(([method, operation]) => [
            `${method} ${path}`,
            (operation as { operationId: string }).operationId,
          ]),
        )
        .filter(
          ([route]) => String(route).includes("domains") || String(route).includes("webhook"),
        ),
    ).toEqual([
      ["post /v1/domains", "createDomain"],
      ["get /v1/domains", "listDomains"],
      ["get /v1/domains/{id}", "getDomain"],
      ["delete /v1/domains/{id}", "deleteDomain"],
      ["post /v1/domains/{id}/verify", "verifyDomain"],
      ["post /v1/webhook_endpoints", "createWebhookEndpoint"],
      ["get /v1/webhook_endpoints", "listWebhookEndpoints"],
      ["get /v1/webhook_endpoints/{id}", "getWebhookEndpoint"],
      ["patch /v1/webhook_endpoints/{id}", "updateWebhookEndpoint"],
      ["delete /v1/webhook_endpoints/{id}", "deleteWebhookEndpoint"],
    ]);
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(Object.keys(doc.components.schemas)).toEqual(
      expect.arrayContaining([
        "SendEmailRequest",
        "Email",
        "EmailRecipient",
        "EmailEvent",
        "EmailEventList",
        "Suppression",
        "SuppressionList",
        "SuppressionCheck",
        "CreateSuppressionRequest",
        "DeletedSuppression",
        "Reputation",
        "ReputationCheck",
        "CreateDomainRequest",
        "Domain",
        "DomainRecord",
        "DomainList",
        "DeletedDomain",
        "CreateWebhookEndpointRequest",
        "UpdateWebhookEndpointRequest",
        "WebhookEndpoint",
        "WebhookEndpointWithSecret",
        "WebhookEndpointList",
        "DeletedWebhookEndpoint",
        "Error",
      ]),
    );
  });
});

describe("toApiError", () => {
  test("keeps the documented type for each status of a Hono HTTPException", () => {
    const cases = [
      [new HTTPException(400, { message: "Malformed JSON in request body" }), 400, "invalid_json"],
      [new HTTPException(401), 401, "invalid_request"],
      [new HTTPException(429), 429, "invalid_request"],
    ] as const;
    const mapped = cases.map(([error]) => toApiError(error));

    expect(mapped.map((e) => [e?.status, e?.code])).toEqual(
      cases.map(([, status, code]) => [status, code]),
    );
    expect(mapped.map((e) => e?.type)).toEqual([
      "invalid_request_error",
      "authentication_error",
      "rate_limit_error",
    ]);
  });

  test("returns null for unexpected errors, so they are logged and answered with a 500", () => {
    expect(toApiError(new HTTPException(502))).toBeNull();
    expect(toApiError(new Error("boom"))).toBeNull();
    expect(toApiError("not even an error")).toBeNull();
  });
});
