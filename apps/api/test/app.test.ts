import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { API_VERSIONS, LATEST_API_VERSION } from "@coss/versioning";
import { HTTPException } from "hono/http-exception";
import { BODY_LIMIT_BYTES, SEND_BODY_LIMIT_BYTES } from "../src/body-limit.ts";
import { toApiError } from "../src/errors.ts";
import { apiRequest, createTestApp, emailBody, errorOf, REQUEST_ID, sendEmail } from "./helpers.ts";

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

    expect(responses.map((res) => res.status)).toEqual([202, 401, 404, 200]);
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

  test("a body over 5 MB is a 413 payload_too_large envelope outside of sends", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name: "x".repeat(BODY_LIMIT_BYTES) },
    });

    expect(res.status).toBe(413);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "payload_too_large",
      message: "The request body is larger than the 5 MB limit.",
    });
  });

  test("a body just under the limit gets past the limit", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/domains", {
      key: tenant.liveKey,
      body: { name: "x".repeat(BODY_LIMIT_BYTES - 1024) },
    });

    expect(res.status).toBe(422);
  });

  test("sends accept bodies over 5 MB, up to their own 40 MB limit", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const content = Buffer.alloc(BODY_LIMIT_BYTES, 1).toString("base64");

    const ok = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({ attachments: [{ filename: "big.pdf", content }] }),
    );
    expect(ok.status).toBe(202);
    await dispatch();
    expect(sandboxProvider.sent[0]?.attachments[0]?.size).toBe(BODY_LIMIT_BYTES);

    const tooLarge = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({ html: "x".repeat(SEND_BODY_LIMIT_BYTES) }),
    );
    expect(tooLarge.status).toBe(413);
    expect(await errorOf(tooLarge)).toMatchObject({
      code: "payload_too_large",
      message: "The request body is larger than the 40 MB limit.",
    });
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("sends authenticate before accepting a large body", async () => {
    const { app } = createTestApp();
    const res = await sendEmail(app, null, emailBody({ html: "x".repeat(SEND_BODY_LIMIT_BYTES) }));
    expect(res.status).toBe(401);
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
      components: {
        schemas: Record<string, unknown>;
        securitySchemes: Record<string, unknown>;
        parameters: Record<string, unknown>;
      };
    };
    expect(doc.openapi).toBe("3.1.0");
    // Checked first: Bun's toMatchObject below replaces matched values with its asymmetric matchers.
    // Every operation takes Coss-Version, echoes it on success and documents invalid_api_version.
    for (const methods of Object.values(doc.paths)) {
      for (const operation of Object.values(methods)) {
        const op = operation as {
          parameters: unknown[];
          responses: Record<string, { description: string; headers?: Record<string, unknown> }>;
        };
        expect(op.parameters).toContainEqual({
          $ref: "#/components/parameters/CossVersion",
        });
        expect(op.responses["400"]?.description).toContain("invalid_api_version");
        for (const [status, response] of Object.entries(op.responses)) {
          if (status.startsWith("2")) expect(response.headers).toHaveProperty("Coss-Version");
        }
      }
    }
    expect(doc.components.parameters.CossVersion).toMatchObject({
      in: "header",
      name: "Coss-Version",
      required: false,
      schema: { type: "string", enum: [...API_VERSIONS] },
    });
    expect(doc.info).toMatchObject({ title: "COSS API", version: LATEST_API_VERSION });
    expect(doc.servers).toEqual([{ url: "http://api.test" }]);
    expect(Object.keys(doc.paths).sort()).toEqual([
      "/v1/audit_events",
      "/v1/audit_events/{id}",
      "/v1/billing",
      "/v1/billing/credits",
      "/v1/billing/invoices",
      "/v1/billing/invoices/{id}",
      "/v1/billing/usage",
      "/v1/domains",
      "/v1/domains/{id}",
      "/v1/domains/{id}/receiving",
      "/v1/domains/{id}/tracking",
      "/v1/domains/{id}/verify",
      "/v1/email_templates",
      "/v1/email_templates/{id}",
      "/v1/email_templates/{id}/draft",
      "/v1/email_templates/{id}/publish",
      "/v1/email_templates/{id}/versions",
      "/v1/email_templates/{id}/versions/{version}",
      "/v1/email_templates/{id}/versions/{version}/restore",
      "/v1/emails",
      "/v1/emails/batch",
      "/v1/emails/{id}",
      "/v1/emails/{id}/cancel",
      "/v1/emails/{id}/events",
      "/v1/emails/{id}/links",
      "/v1/emails/{id}/reschedule",
      "/v1/hooks/applications",
      "/v1/hooks/applications/{application}",
      "/v1/hooks/applications/{application}/deliveries/{delivery_id}",
      "/v1/hooks/applications/{application}/deliveries/{delivery_id}/attempts",
      "/v1/hooks/applications/{application}/deliveries/{delivery_id}/retry",
      "/v1/hooks/applications/{application}/endpoints",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}/deliveries",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}/recover",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}/recoveries/{recovery_id}",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}/roll_secret",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}/secret",
      "/v1/hooks/applications/{application}/endpoints/{endpoint_id}/test",
      "/v1/hooks/applications/{application}/messages",
      "/v1/hooks/applications/{application}/messages/{message_id}",
      "/v1/hooks/applications/{application}/messages/{message_id}/deliveries",
      "/v1/hooks/applications/{application}/portal_sessions",
      "/v1/hooks/event_types",
      "/v1/hooks/event_types/{name}",
      "/v1/log_drains",
      "/v1/log_drains/{id}",
      "/v1/log_drains/{id}/batches",
      "/v1/log_drains/{id}/batches/{batch_id}",
      "/v1/logs",
      "/v1/logs/{id}",
      "/v1/received_emails",
      "/v1/received_emails/address",
      "/v1/received_emails/{id}",
      "/v1/received_emails/{id}/attachments/{attachment_id}",
      "/v1/received_emails/{id}/raw",
      "/v1/reputation",
      "/v1/risk/assessments",
      "/v1/risk/assessments/{id}",
      "/v1/risk/assessments/{id}/feedback",
      "/v1/risk/calibration",
      "/v1/risk/content/classify",
      "/v1/risk/email/check",
      "/v1/risk/ip/check",
      "/v1/risk/limit_buckets",
      "/v1/risk/limit_buckets/{id}",
      "/v1/risk/limits",
      "/v1/risk/list_entries",
      "/v1/risk/list_entries/{id}",
      "/v1/risk/rules",
      "/v1/risk/rules/{id}",
      "/v1/risk/settings",
      "/v1/risk/users/{user_id}",
      "/v1/suppressions",
      "/v1/suppressions/check",
      "/v1/suppressions/export",
      "/v1/suppressions/import",
      "/v1/suppressions/{id}",
      "/v1/tracking_settings",
      "/v1/tracking_settings/categories/{category}",
      "/v1/tracking_settings/default",
      "/v1/webhook_endpoints",
      "/v1/webhook_endpoints/{id}",
      "/v1/webhook_endpoints/{id}/deliveries",
      "/v1/webhook_endpoints/{id}/deliveries/{delivery_id}",
      "/v1/webhook_endpoints/{id}/deliveries/{delivery_id}/retry",
      "/v1/webhook_endpoints/{id}/recover",
      "/v1/webhook_endpoints/{id}/roll_secret",
    ]);
    expect(doc.paths["/v1/emails"]?.post).toMatchObject({
      operationId: "sendEmail",
      tags: ["Emails"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "header", name: "Idempotency-Key", required: false },
        { $ref: "#/components/parameters/CossVersion" },
      ],
    });
    expect(doc.paths["/v1/emails/batch"]?.post).toMatchObject({
      operationId: "sendEmailBatch",
      tags: ["Emails"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "header", name: "Idempotency-Key", required: false },
        { $ref: "#/components/parameters/CossVersion" },
      ],
    });
    expect(doc.paths["/v1/emails/{id}"]?.get).toMatchObject({
      operationId: "getEmail",
      parameters: [
        { in: "path", name: "id", required: true },
        { $ref: "#/components/parameters/CossVersion" },
      ],
    });
    expect(doc.paths["/v1/emails/{id}/events"]?.get).toMatchObject({
      operationId: "listEmailEvents",
      parameters: [
        { in: "path", name: "id", required: true },
        { $ref: "#/components/parameters/CossVersion" },
      ],
    });
    expect(doc.paths["/v1/logs"]?.get).toMatchObject({
      operationId: "listLogs",
      security: [{ bearerAuth: [] }],
    });
    expect(doc.paths["/v1/logs/{id}"]?.get).toMatchObject({ operationId: "getLog" });
    expect(doc.paths["/v1/audit_events"]?.get).toMatchObject({
      operationId: "listAuditEvents",
      tags: ["Audit log"],
      security: [{ bearerAuth: [] }],
    });
    expect(doc.paths["/v1/audit_events/{id}"]?.get).toMatchObject({
      operationId: "getAuditEvent",
    });
    expect(doc.paths["/v1/reputation"]?.get).toMatchObject({
      operationId: "getReputation",
      security: [{ bearerAuth: [] }],
    });
    expect(doc.paths["/v1/received_emails"]?.get).toMatchObject({
      operationId: "listReceivedEmails",
      tags: ["Receiving"],
      security: [{ bearerAuth: [] }],
    });
    expect(doc.paths["/v1/received_emails/{id}/raw"]?.get).toMatchObject({
      operationId: "getReceivedEmailRaw",
      responses: { 200: { content: { "message/rfc822": {} } } },
    });
    expect(doc.paths["/v1/emails/{id}/cancel"]?.post).toMatchObject({
      operationId: "cancelEmail",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true },
        { $ref: "#/components/parameters/CossVersion" },
      ],
    });
    expect(doc.paths["/v1/emails/{id}/reschedule"]?.post).toMatchObject({
      operationId: "rescheduleEmail",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true },
        { $ref: "#/components/parameters/CossVersion" },
      ],
    });
    expect(doc.paths["/v1/emails/{id}/links"]?.get).toMatchObject({
      operationId: "listEmailLinks",
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
    // Hooks: every operation is named (its docs page) and authenticated.
    const hookOperations = Object.entries(doc.paths)
      .filter(([path]) => path.startsWith("/v1/hooks/"))
      .flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, operation]) => {
          const op = operation as { operationId: string; security?: unknown };
          expect(op.security).toEqual([{ bearerAuth: [] }]);
          return `${method} ${path} ${op.operationId}`;
        }),
      );
    expect(hookOperations.sort()).toEqual(
      [
        "delete /v1/hooks/applications/{application} deleteHookApplication",
        "delete /v1/hooks/applications/{application}/endpoints/{endpoint_id} deleteHookEndpoint",
        "delete /v1/hooks/event_types/{name} archiveHookEventType",
        "get /v1/hooks/applications listHookApplications",
        "get /v1/hooks/applications/{application} getHookApplication",
        "get /v1/hooks/applications/{application}/deliveries/{delivery_id} getHookDelivery",
        "get /v1/hooks/applications/{application}/deliveries/{delivery_id}/attempts listHookDeliveryAttempts",
        "get /v1/hooks/applications/{application}/endpoints listHookEndpoints",
        "get /v1/hooks/applications/{application}/endpoints/{endpoint_id} getHookEndpoint",
        "get /v1/hooks/applications/{application}/endpoints/{endpoint_id}/deliveries listHookEndpointDeliveries",
        "get /v1/hooks/applications/{application}/endpoints/{endpoint_id}/recoveries/{recovery_id} getHookEndpointRecovery",
        "get /v1/hooks/applications/{application}/endpoints/{endpoint_id}/secret getHookEndpointSecret",
        "get /v1/hooks/applications/{application}/messages listHookMessages",
        "get /v1/hooks/applications/{application}/messages/{message_id} getHookMessage",
        "get /v1/hooks/applications/{application}/messages/{message_id}/deliveries listHookMessageDeliveries",
        "get /v1/hooks/event_types listHookEventTypes",
        "get /v1/hooks/event_types/{name} getHookEventType",
        "patch /v1/hooks/applications/{application} updateHookApplication",
        "patch /v1/hooks/applications/{application}/endpoints/{endpoint_id} updateHookEndpoint",
        "patch /v1/hooks/event_types/{name} updateHookEventType",
        "post /v1/hooks/applications createHookApplication",
        "post /v1/hooks/applications/{application}/deliveries/{delivery_id}/retry retryHookDelivery",
        "post /v1/hooks/applications/{application}/endpoints createHookEndpoint",
        "post /v1/hooks/applications/{application}/endpoints/{endpoint_id}/recover recoverHookEndpoint",
        "post /v1/hooks/applications/{application}/endpoints/{endpoint_id}/roll_secret rollHookEndpointSecret",
        "post /v1/hooks/applications/{application}/endpoints/{endpoint_id}/test sendHookEndpointTest",
        "post /v1/hooks/applications/{application}/messages sendHookMessage",
        "post /v1/hooks/applications/{application}/portal_sessions createHookPortalSession",
        "post /v1/hooks/event_types createHookEventType",
      ].sort(),
    );
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
          ([route]) =>
            String(route).includes("email_templates") ||
            String(route).includes("domains") ||
            String(route).includes("webhook") ||
            String(route).includes("log_drains") ||
            String(route).includes("/risk/") ||
            String(route).includes("tracking_settings"),
        ),
    ).toEqual([
      ["post /v1/email_templates", "createEmailTemplate"],
      ["get /v1/email_templates", "listEmailTemplates"],
      ["get /v1/email_templates/{id}", "getEmailTemplate"],
      ["patch /v1/email_templates/{id}", "updateEmailTemplate"],
      ["delete /v1/email_templates/{id}", "deleteEmailTemplate"],
      ["get /v1/email_templates/{id}/draft", "getEmailTemplateDraft"],
      ["put /v1/email_templates/{id}/draft", "updateEmailTemplateDraft"],
      ["post /v1/email_templates/{id}/publish", "publishEmailTemplate"],
      ["get /v1/email_templates/{id}/versions", "listEmailTemplateVersions"],
      ["get /v1/email_templates/{id}/versions/{version}", "getEmailTemplateVersion"],
      ["post /v1/email_templates/{id}/versions/{version}/restore", "restoreEmailTemplateVersion"],
      ["post /v1/domains", "createDomain"],
      ["get /v1/domains", "listDomains"],
      ["get /v1/domains/{id}", "getDomain"],
      ["delete /v1/domains/{id}", "deleteDomain"],
      ["post /v1/domains/{id}/verify", "verifyDomain"],
      ["post /v1/domains/{id}/tracking", "createTrackingDomain"],
      ["delete /v1/domains/{id}/tracking", "deleteTrackingDomain"],
      ["post /v1/domains/{id}/receiving", "createReceivingDomain"],
      ["delete /v1/domains/{id}/receiving", "deleteReceivingDomain"],
      ["post /v1/webhook_endpoints", "createWebhookEndpoint"],
      ["get /v1/webhook_endpoints", "listWebhookEndpoints"],
      ["get /v1/webhook_endpoints/{id}", "getWebhookEndpoint"],
      ["patch /v1/webhook_endpoints/{id}", "updateWebhookEndpoint"],
      ["delete /v1/webhook_endpoints/{id}", "deleteWebhookEndpoint"],
      ["post /v1/webhook_endpoints/{id}/roll_secret", "rollWebhookEndpointSecret"],
      ["post /v1/webhook_endpoints/{id}/recover", "recoverWebhookEndpoint"],
      ["get /v1/webhook_endpoints/{id}/deliveries", "listWebhookDeliveries"],
      ["get /v1/webhook_endpoints/{id}/deliveries/{delivery_id}", "getWebhookDelivery"],
      ["post /v1/webhook_endpoints/{id}/deliveries/{delivery_id}/retry", "retryWebhookDelivery"],
      ["get /v1/tracking_settings", "getTrackingSettings"],
      ["patch /v1/tracking_settings/default", "updateTrackingDefault"],
      ["delete /v1/tracking_settings/default", "deleteTrackingDefault"],
      ["patch /v1/tracking_settings/categories/{category}", "updateTrackingCategory"],
      ["delete /v1/tracking_settings/categories/{category}", "deleteTrackingCategory"],
      ["post /v1/log_drains", "createLogDrain"],
      ["get /v1/log_drains", "listLogDrains"],
      ["get /v1/log_drains/{id}", "getLogDrain"],
      ["patch /v1/log_drains/{id}", "updateLogDrain"],
      ["delete /v1/log_drains/{id}", "deleteLogDrain"],
      ["get /v1/log_drains/{id}/batches", "listLogDrainBatches"],
      ["get /v1/log_drains/{id}/batches/{batch_id}", "getLogDrainBatch"],
      ["post /v1/risk/assessments", "createRiskAssessment"],
      ["get /v1/risk/assessments", "listRiskAssessments"],
      ["get /v1/risk/assessments/{id}", "getRiskAssessment"],
      ["post /v1/risk/assessments/{id}/feedback", "createRiskFeedback"],
      ["post /v1/risk/list_entries", "createRiskListEntry"],
      ["get /v1/risk/list_entries", "listRiskListEntries"],
      ["get /v1/risk/list_entries/{id}", "getRiskListEntry"],
      ["delete /v1/risk/list_entries/{id}", "deleteRiskListEntry"],
      ["delete /v1/risk/users/{user_id}", "forgetRiskUser"],
      ["get /v1/risk/settings", "getRiskSettings"],
      ["patch /v1/risk/settings", "updateRiskSettings"],
      ["get /v1/risk/calibration", "getRiskCalibration"],
      ["post /v1/risk/rules", "createRiskRule"],
      ["get /v1/risk/rules", "listRiskRules"],
      ["get /v1/risk/rules/{id}", "getRiskRule"],
      ["patch /v1/risk/rules/{id}", "updateRiskRule"],
      ["delete /v1/risk/rules/{id}", "deleteRiskRule"],
      ["post /v1/risk/email/check", "checkRiskEmail"],
      ["post /v1/risk/ip/check", "checkRiskIp"],
      ["post /v1/risk/content/classify", "classifyRiskContent"],
      ["post /v1/risk/limits", "checkRiskLimit"],
      ["post /v1/risk/limit_buckets", "createRiskLimitBucket"],
      ["get /v1/risk/limit_buckets", "listRiskLimitBuckets"],
      ["get /v1/risk/limit_buckets/{id}", "getRiskLimitBucket"],
      ["patch /v1/risk/limit_buckets/{id}", "updateRiskLimitBucket"],
      ["delete /v1/risk/limit_buckets/{id}", "deleteRiskLimitBucket"],
    ]);
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(Object.keys(doc.components.schemas)).toEqual(
      expect.arrayContaining([
        "SendEmailRequest",
        "SendEmailBatchRequest",
        "Email",
        "EmailBatch",
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
        "Log",
        "LogList",
        "AuditEvent",
        "AuditEventList",
        "CreateRiskAssessmentRequest",
        "RiskAssessment",
        "RiskAssessmentList",
        "RiskReason",
        "CreateRiskFeedbackRequest",
        "CreateRiskListEntryRequest",
        "RiskListEntry",
        "RiskListEntryList",
        "RiskSettings",
        "UpdateRiskSettingsRequest",
        "RiskRule",
        "RiskRuleCondition",
        "CreateRiskRuleRequest",
        "UpdateRiskRuleRequest",
        "RiskRuleList",
        "ImportSuppressionsRequest",
        "SuppressionImport",
        "CreateDomainRequest",
        "Domain",
        "DomainRecord",
        "DomainList",
        "DeletedDomain",
        "TrackingDomain",
        "CreateTrackingDomainRequest",
        "TrackingSettings",
        "TrackingRule",
        "UpdateTrackingRuleRequest",
        "DeletedTrackingRule",
        "CreateWebhookEndpointRequest",
        "UpdateWebhookEndpointRequest",
        "RollWebhookEndpointSecretRequest",
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
