/**
 * Contract test: the published `coss` SDK (built dist) against the real app, in process.
 * Wire-level drift between the API and the SDK's hand-written types fails here or in
 * contract-types.ts (compile time).
 */
import { describe, expect, test } from "bun:test";
import { db } from "@coss/db";
import { newId } from "@coss/db/id";
import { trackingUrls } from "@coss/email/testing";
import { createLogWriter } from "@coss/logs";
import { cachedOverrides, setRateLimitOverride } from "@coss/ratelimit";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { suspendOrganization } from "@coss/reputation";
import { createTestTenant } from "@coss/tenancy/testing";
import { API_VERSIONS, LATEST_API_VERSION } from "@coss/versioning";
import { enqueueWebhookMessage, runDueWebhookDeliveries } from "@coss/webhooks";
import { TEST_SECRETS_KEY } from "@coss/webhooks/testing";
import { API_VERSION, Coss, type CossOptions, API_VERSIONS as SDK_API_VERSIONS } from "coss";
import {
  createTestApp,
  domainFrom,
  REQUEST_ID,
  type TestApp,
  TRACKING_BASE_URL,
  uniqueDomainName,
} from "./helpers.ts";

function toRequest(input: string | URL | Request, init?: RequestInit): Request {
  // bun-types has no `new Request(URL)` overload.
  return input instanceof Request ? new Request(input, init) : new Request(String(input), init);
}

function clientFor(app: TestApp, apiKey: string, options: Partial<CossOptions> = {}): Coss {
  return new Coss({
    apiKey,
    baseUrl: "http://api.test",
    // Straight into the app's fetch handler: no network, but real Request/Response objects.
    fetch: (input, init) => Promise.resolve(app.fetch(toRequest(input, init))),
    ...options,
  });
}

describe("API versions", () => {
  test("the SDK requests the latest API version, and knows every version", async () => {
    expect(API_VERSION).toBe(LATEST_API_VERSION);
    expect([...SDK_API_VERSIONS]).toEqual([...API_VERSIONS]);

    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const versions: (string | null)[] = [];
    const coss = clientFor(app, tenant.sandboxKey, {
      fetch: async (input, init) => {
        const res = await app.fetch(toRequest(input, init));
        versions.push(res.headers.get("coss-version"));
        return res;
      },
    });
    await coss.domains.list();
    expect(versions).toEqual([API_VERSION]);

    const created = await coss.webhookEndpoints.create({
      url: "https://example.com/hook",
      api_version: API_VERSION,
    });
    expect(created.data?.api_version).toBe(API_VERSION);
  });
});

describe("coss SDK against the API", () => {
  test("send then get round-trips the same email", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    const sent = await coss.email.send({
      from: "Acme <hello@acme.com>",
      to: "user@example.com",
      cc: ["copy@example.com"],
      subject: "Welcome",
      html: "<p>Hello!</p>",
      headers: { "X-Campaign": "fall" },
      tags: [{ name: "category", value: "welcome" }],
      attachments: [{ filename: "notes.txt", content: btoa("hi") }],
    });

    expect(sent.error).toBeNull();
    expect(sent.data).toMatchObject({
      object: "email",
      to: ["user@example.com"],
      cc: ["copy@example.com"],
      headers: { "x-campaign": "fall" },
      tags: [{ name: "category", value: "welcome" }],
      attachments: [
        { filename: "notes.txt", content_type: "text/plain", content_id: null, size: 2 },
      ],
      status: "queued",
      sandbox: true,
    });
    if (!sent.data) throw new Error("send failed");

    const fetched = await coss.email.get(sent.data.id);
    expect(fetched).toEqual({ data: sent.data, error: null });

    await dispatch();
    const dispatched = await coss.email.get(sent.data.id);
    expect(dispatched.data).toMatchObject({ id: sent.data.id, status: "sent" });
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("recipients and events report simulated delivery outcomes", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    const sent = await coss.email.send({
      from: "hello@acme.com",
      to: ["success@simulator.amazonses.com", "bounce@simulator.amazonses.com"],
      subject: "Hi",
      text: "Hi",
    });
    if (!sent.data) throw new Error("send failed");
    await dispatch();
    const fetched = await coss.email.get(sent.data.id);
    expect(fetched.data?.recipients.map((r) => [r.address, r.status])).toEqual([
      ["success@simulator.amazonses.com", "delivered"],
      ["bounce@simulator.amazonses.com", "bounced"],
    ]);

    const events = await coss.email.listEvents(sent.data.id);
    expect(events.error).toBeNull();
    expect(events.data?.data.map((e) => [e.type, e.recipient])).toEqual([
      ["email.sent", null],
      ["email.delivered", "success@simulator.amazonses.com"],
      ["email.bounced", "bounce@simulator.amazonses.com"],
    ]);
  });

  test("tracking: send, hit the pixel and a link, then read engagement back", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    const sent = await coss.email.send({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Hi",
      html: '<p><a href="https://acme.com/start">Start</a></p>',
      tracking: { opens: true, clicks: true },
    });
    if (!sent.data) throw new Error("send failed");
    expect(sent.data.tracking).toMatchObject({ opens: true, clicks: true, open_count: 0 });
    await dispatch();
    const { open, clicks } = trackingUrls(sandboxProvider.sent.at(-1)?.html ?? "");
    for (const url of [open ?? "", clicks[0] ?? ""]) {
      await app.request(url.slice(TRACKING_BASE_URL.length));
    }

    const fetched = await coss.email.get(sent.data.id);
    expect(fetched.data?.tracking).toMatchObject({ open_count: 1, click_count: 1 });
    const events = await coss.email.listEvents(sent.data.id);
    expect(events.data?.data.map((e) => e.type)).toEqual(
      expect.arrayContaining(["email.opened", "email.clicked"]),
    );
    const links = await coss.email.listLinks(sent.data.id);
    expect(links.error).toBeNull();
    expect(links.data?.data).toEqual([
      expect.objectContaining({
        object: "email_link",
        url: "https://acme.com/start",
        click_count: 1,
      }),
    ]);
  });

  test("an SDK retry with the same idempotency key does not send twice", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const params = { from: "hello@acme.com", to: "user@example.com", subject: "Hi", text: "Hi" };
    const idempotencyKey = crypto.randomUUID();

    const first = await coss.email.send(params, { idempotencyKey });
    const second = await coss.email.send(params, { idempotencyKey });

    expect(second.data?.id).toBe(first.data?.id ?? "missing");
    await dispatch();
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("sendBatch sends every email once, even when retried with the same key", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const emails = [
      { from: "hello@acme.com", to: "a@example.com", subject: "Hi", text: "Hi" },
      { from: "hello@acme.com", to: "b@example.com", subject: "Hi", text: "Hi" },
    ];
    const idempotencyKey = crypto.randomUUID();

    const first = await coss.email.sendBatch(emails, { idempotencyKey });
    const second = await coss.email.sendBatch(emails, { idempotencyKey });

    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ object: "email_batch" });
    expect(first.data?.data.map((email) => [email.to, email.batch_id])).toEqual([
      [["a@example.com"], first.data?.id ?? "missing"],
      [["b@example.com"], first.data?.id ?? "missing"],
    ]);
    expect(second.data?.id).toBe(first.data?.id ?? "missing");
    await dispatch();
    expect(sandboxProvider.sent).toHaveLength(2);

    const invalid = await coss.email.sendBatch([
      { from: "hello@acme.com", to: "a@example.com", subject: "Hi", text: "Hi" },
      { from: "hello@acme.com", to: "nope", subject: "Hi", text: "Hi" },
    ]);
    expect(invalid.error).toMatchObject({
      type: "invalid_request_error",
      code: "validation_error",
    });
    expect(invalid.error?.issues?.map((issue) => issue.path)).toEqual(["emails.1.to"]);
  });

  test("an invalid key maps to authentication_error with the request id", async () => {
    const { app } = createTestApp();
    const coss = clientFor(app, `coss_test_${"z".repeat(64)}`, { maxRetries: 0 });

    const result = await coss.email.send({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Hi",
      text: "Hi",
    });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "authentication_error",
      code: "invalid_api_key",
      status: 401,
    });
    expect(result.error?.request_id).toMatch(REQUEST_ID);
  });

  test("a used-up send quota maps to rate_limit_error without waiting", async () => {
    const tenant = await createTestTenant();
    await setRateLimitOverride({
      organizationId: tenant.organization.id,
      bucket: "email.sandbox_recipients.day",
      rule: { limit: 1, periodMs: 86_400_000 },
    });
    const { app } = createTestApp({ rateLimiter: memoryLimiter({ overrides: cachedOverrides() }) });
    // Default retries: a Retry-After of hours is returned, not slept on.
    const coss = clientFor(app, tenant.sandboxKey);
    const email = { from: "hello@acme.com", to: "user@example.com", subject: "Hi", text: "Hi" };

    expect((await coss.email.send(email)).error).toBeNull();
    const result = await coss.email.send(email);
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "rate_limit_error",
      code: "quota_exceeded",
      status: 429,
    });
  });

  test("validation errors map param and issues", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey, { maxRetries: 0 });

    const result = await coss.email.send({
      from: "hello@acme.com",
      to: ["user@example.com", "nope"],
      subject: "Hi",
      text: "Hi",
    });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "validation_error",
      status: 422,
      param: "to.1",
    });
    expect(result.error?.issues).toEqual([{ path: "to.1", message: expect.any(String) }]);
  });

  test("an email from another environment maps to not_found_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const sandbox = clientFor(app, tenant.sandboxKey);
    const live = clientFor(app, tenant.liveKey, { maxRetries: 0 });

    const sent = await sandbox.email.send({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Hi",
      text: "Hi",
    });
    const result = await live.email.get(sent.data?.id ?? "missing");

    expect(result.error).toMatchObject({ type: "not_found_error", status: 404 });
  });

  test("suppressions: add, check, list, get, remove, and a category send skips the address", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    const added = await coss.email.suppressions.add({
      address: "Jane <Jane@Example.com>",
      scope: "marketing",
    });
    expect(added.error).toBeNull();
    expect(added.data).toMatchObject({
      object: "suppression",
      address: "jane@example.com",
      scope: "marketing",
      reason: "manual",
      email_id: null,
    });
    if (!added.data) throw new Error("add failed");
    expect(
      (await coss.email.suppressions.add({ address: "jane@example.com", scope: "marketing" })).data,
    ).toEqual(added.data);

    const check = await coss.email.suppressions.check({
      address: "jane@example.com",
      category: "marketing",
    });
    expect(check).toEqual({
      data: {
        object: "suppression_check",
        address: "jane@example.com",
        suppressed: true,
        suppressions: [added.data],
      },
      error: null,
    });
    expect(
      (await coss.email.suppressions.check({ address: "jane@example.com" })).data?.suppressed,
    ).toBe(false);
    expect(await coss.email.suppressions.list({ scope: "marketing", limit: 10 })).toEqual({
      data: { object: "list", data: [added.data], has_more: false },
      error: null,
    });
    expect(await coss.email.suppressions.get(added.data.id)).toEqual({
      data: added.data,
      error: null,
    });

    const skipped = await coss.email.send({
      from: "hello@acme.com",
      to: ["jane@example.com", "joe@example.com"],
      subject: "Sale",
      text: "Sale",
      category: "marketing",
    });
    expect(skipped.data?.category).toBe("marketing");
    // Suppressed at send time, before dispatch.
    expect(skipped.data?.recipients.map((r) => [r.address, r.status])).toEqual([
      ["jane@example.com", "suppressed"],
      ["joe@example.com", "queued"],
    ]);
    await dispatch();
    const dispatched = await coss.email.get(skipped.data?.id ?? "");
    expect(dispatched.data?.recipients.map((r) => [r.address, r.status])).toEqual([
      ["jane@example.com", "suppressed"],
      ["joe@example.com", "delivered"],
    ]);
    expect(sandboxProvider.sent.at(-1)?.to).toEqual(["joe@example.com"]);
    const events = await coss.email.listEvents(skipped.data?.id ?? "");
    expect(events.data?.data.find((e) => e.type === "email.suppressed")).toMatchObject({
      recipient: "jane@example.com",
      data: { suppression: { id: added.data.id, scope: "marketing", reason: "manual" } },
    });

    expect(await coss.email.suppressions.remove(added.data.id)).toEqual({
      data: { object: "suppression", id: added.data.id, deleted: true },
      error: null,
    });
    const gone = await coss.email.suppressions.get(added.data.id);
    expect(gone.error).toMatchObject({ type: "not_found_error", code: "not_found", status: 404 });
    const validation = await coss.email.suppressions.add({ address: "nope", scope: "*" });
    expect(validation.error).toMatchObject({ type: "invalid_request_error", param: "address" });
  });
});

describe("coss.email.suppressions bulk import and export against the API", () => {
  test("import batches large lists, and export returns CSV that imports again", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const suppressions = Array.from({ length: 1500 }, (_, i) => ({
      address: `user${i}@example.com`,
    }));
    suppressions.push({ address: "nope" }, { address: "user0@example.com" });

    expect(await coss.email.suppressions.import({ suppressions })).toEqual({
      data: {
        object: "suppression_import",
        created: 1500,
        existing: 1,
        invalid: [{ index: 1500, address: "nope", message: expect.any(String) }],
      },
      error: null,
    });

    const exported = await coss.email.suppressions.export({ reason: "import" });
    const lines = exported.data?.trimEnd().split("\r\n") ?? [];
    expect(lines).toHaveLength(1501);
    expect(lines[1]).toMatch(/^user\d+@example\.com,\*,import,[^,]+,,sup_\w+$/);

    const other = clientFor(app, tenant.liveKey);
    const rows = lines.slice(1).map((line) => {
      const [address = "", scope] = line.split(",");
      return { address, scope };
    });
    expect((await other.email.suppressions.import({ suppressions: rows })).data?.created).toBe(
      1500,
    );
  });
  test("a scheduled send can be canceled", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const scheduled = await coss.email.send({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Later",
      text: "Hi",
      scheduled_at: scheduledAt,
    });
    expect(scheduled.data).toMatchObject({ status: "scheduled", scheduled_at: scheduledAt });
    if (!scheduled.data) throw new Error("send failed");

    const canceled = await coss.email.cancel(scheduled.data.id);
    expect(canceled.error).toBeNull();
    expect(canceled.data).toMatchObject({
      status: "canceled",
      recipients: [{ status: "canceled" }],
    });
    const events = await coss.email.listEvents(scheduled.data.id);
    expect(events.data?.data.map((e) => e.type)).toEqual(["email.scheduled", "email.canceled"]);
    expect(sandboxProvider.sent).toHaveLength(0);

    const sent = await coss.email.send({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Now",
      text: "Hi",
    });
    if (!sent.data) throw new Error("send failed");
    const refused = await coss.email.cancel(sent.data.id);
    expect(refused.error).toMatchObject({ code: "email_not_cancelable", status: 422 });
  });

  test("a scheduled send can be rescheduled", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const scheduled = await coss.email.send({
      from: "hello@acme.com",
      to: "user@example.com",
      subject: "Later",
      text: "Hi",
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    if (!scheduled.data) throw new Error("send failed");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const rescheduled = await coss.email.reschedule(scheduled.data.id, { scheduled_at: tomorrow });
    expect(rescheduled.error).toBeNull();
    expect(rescheduled.data).toMatchObject({ status: "scheduled", scheduled_at: tomorrow });
    const events = await coss.email.listEvents(scheduled.data.id);
    expect(events.data?.data.at(-1)).toMatchObject({
      type: "email.rescheduled",
      data: {
        reschedule: { scheduled_at: tomorrow, previous_scheduled_at: scheduled.data.scheduled_at },
      },
    });
    expect(sandboxProvider.sent).toHaveLength(0);

    await coss.email.cancel(scheduled.data.id);
    const refused = await coss.email.reschedule(scheduled.data.id, { scheduled_at: tomorrow });
    expect(refused.error).toMatchObject({ code: "email_not_reschedulable", status: 422 });
  });
});

describe("coss.domains against the API", () => {
  test("create, verify, list and delete round-trip a domain", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.liveKey);
    const name = uniqueDomainName();

    const created = await coss.domains.create({ name });
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({ object: "domain", name, status: "pending" });
    if (!created.data) throw new Error("create failed");
    expect(created.data.records.map((record) => record.purpose)).toContain("dkim");

    const verified = await coss.domains.verify(created.data.id);
    expect(verified.data).toMatchObject({
      id: created.data.id,
      status: "verified",
      can_send: true,
    });

    const fetched = await coss.domains.get(created.data.id);
    expect(fetched.data).toEqual(verified.data);

    const listed = await coss.domains.list();
    expect(listed.data?.data.map((domain) => domain.id)).toEqual([created.data.id]);

    const deleted = await coss.domains.delete(created.data.id);
    expect(deleted.data).toEqual({ object: "domain", id: created.data.id, deleted: true });
    expect((await coss.domains.get(created.data.id)).error).toMatchObject({
      type: "not_found_error",
      status: 404,
    });
  });

  test("an invalid name maps to invalid_request_error with the param", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.liveKey, { maxRetries: 0 });

    const result = await coss.domains.create({ name: "not a domain" });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "invalid_domain",
      status: 422,
      param: "name",
    });
    expect(result.error?.request_id).toMatch(REQUEST_ID);
  });
});

describe("coss.webhookEndpoints against the API", () => {
  test("a lost creation response does not create a duplicate endpoint", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    let attempts = 0;
    let createdId: string | undefined;
    let creationStatus: number | undefined;
    const coss = clientFor(app, tenant.sandboxKey, {
      maxRetries: 3,
      fetch: async (input, init) => {
        attempts++;
        const response = await app.fetch(toRequest(input, init));
        creationStatus = response.status;
        const created = (await response.json()) as { id: string };
        createdId = created.id;
        throw new TypeError("Connection lost after creation committed");
      },
    });

    const result = await coss.webhookEndpoints.create(
      { url: "https://example.com/hook" },
      { idempotencyKey: crypto.randomUUID() },
    );

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("network_error");
    expect(attempts).toBe(1);
    expect(creationStatus).toBe(200);
    if (!createdId) throw new Error("creation did not commit");
    const listed = await clientFor(app, tenant.sandboxKey).webhookEndpoints.list();
    expect(listed.error).toBeNull();
    expect(listed.data?.data.map((endpoint) => endpoint.id)).toEqual([createdId]);
  });

  test("create, update, list and delete round-trip an endpoint", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    const created = await coss.webhookEndpoints.create({
      url: "https://example.com/webhooks/coss",
      description: "Receiver",
      event_types: ["email.bounced", "email.complained"],
    });
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({
      object: "webhook_endpoint",
      url: "https://example.com/webhooks/coss",
      description: "Receiver",
      event_types: ["email.bounced", "email.complained"],
      enabled: true,
    });
    if (!created.data) throw new Error("create failed");
    expect(created.data.secret).toStartWith("whsec_");
    // Events are rendered in the SDK's version, matching its WebhookEvent types.
    expect(created.data.api_version).toBe(API_VERSION);

    const updated = await coss.webhookEndpoints.update(created.data.id, { enabled: false });
    expect(updated.data).toMatchObject({ id: created.data.id, enabled: false });
    if (!updated.data) throw new Error("update failed");

    const listed = await coss.webhookEndpoints.list();
    expect(listed.data?.data).toEqual([updated.data]);
    // The secret is returned once, by create, and is never part of a read.
    expect(listed.data?.data[0]).not.toHaveProperty("secret");

    const deleted = await coss.webhookEndpoints.delete(created.data.id);
    expect(deleted.data).toEqual({
      object: "webhook_endpoint",
      id: created.data.id,
      deleted: true,
    });
  });

  test("an endpoint of the other environment maps to not_found_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const sandbox = clientFor(app, tenant.sandboxKey);
    const live = clientFor(app, tenant.liveKey, { maxRetries: 0 });

    const created = await sandbox.webhookEndpoints.create({ url: "https://example.com/hook" });
    const result = await live.webhookEndpoints.get(created.data?.id ?? "missing");

    expect(result.error).toMatchObject({ type: "not_found_error", status: 404 });
  });
});

describe("coss.webhookEndpoints.deliveries against the API", () => {
  test("list, get and retry round-trip a delivery", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const endpoint = await coss.webhookEndpoints.create({ url: "https://example.com/hook" });
    if (!endpoint.data) throw new Error("create failed");
    const eventId = newId("evt");
    await enqueueWebhookMessage(db, {
      id: eventId,
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      type: "email.delivered",
      payload: { id: eventId, object: "event", type: "email.delivered", data: {} },
    });
    await runDueWebhookDeliveries(
      { scope: { organizationIds: [tenant.organization.id] } },
      { secretsKey: TEST_SECRETS_KEY, send: async () => ({ status: 200, body: "ok" }) },
    );

    const listed = await coss.webhookEndpoints.deliveries.list(endpoint.data.id, {
      status: "succeeded",
      limit: 10,
    });
    expect(listed.error).toBeNull();
    const [delivery] = listed.data?.data ?? [];
    expect(delivery).toMatchObject({
      object: "webhook_delivery",
      event_id: eventId,
      status: "succeeded",
      attempts: [{ object: "webhook_attempt", status_code: 200, response_excerpt: "ok" }],
    });
    if (!delivery) throw new Error("no delivery");

    const fetched = await coss.webhookEndpoints.deliveries.get(endpoint.data.id, delivery.id);
    expect(fetched).toEqual({ data: delivery, error: null });

    const retried = await coss.webhookEndpoints.deliveries.retry(endpoint.data.id, delivery.id);
    expect(retried.data).toMatchObject({ id: delivery.id, status: "pending" });
  });
});

describe("coss.reputation against the API", () => {
  test("get mirrors the standing, and a suspended live send is a permission_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.liveKey);
    const from = await domainFrom(tenant.organization.id);

    expect(await coss.reputation.get()).toEqual({
      data: {
        object: "reputation",
        status: "good",
        reason: null,
        status_changed_at: null,
        evaluated_at: null,
        window: null,
        checks: [],
      },
      error: null,
    });

    await suspendOrganization({
      organizationId: tenant.organization.id,
      trigger: "bounce_rate",
      actor: { kind: "system" },
    });
    const { data } = await coss.reputation.get();
    expect(data).toMatchObject({ status: "suspended", reason: "bounce_rate" });
    expect(data?.status_changed_at).toBeString();

    const sent = await coss.email.send({ from, to: "user@example.com", subject: "Hi", text: "Hi" });
    expect(sent.data).toBeNull();
    expect(sent.error).toMatchObject({
      type: "permission_error",
      code: "account_suspended",
      status: 403,
    });
  });
});

describe("coss.logs against the API", () => {
  test("list and get read the environment's request log", async () => {
    const tenant = await createTestTenant();
    const writer = createLogWriter({ flushMs: 60_000 });
    const { app } = createTestApp({ logWriter: writer });
    const coss = clientFor(app, tenant.sandboxKey);
    await coss.email.send({
      from: "Acme <hello@acme.com>",
      to: "nobody",
      subject: "Hi",
      text: "Hi",
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    await writer.flush();

    const listed = await coss.logs.list({ level: ["warning", "error"], status: ["4xx"] });
    expect(listed.error).toBeNull();
    expect(listed.data?.data).toHaveLength(1);
    const line = listed.data?.data[0];
    if (!line) throw new Error("missing log line");
    expect(line).toMatchObject({
      object: "log",
      source: "api",
      level: "warning",
      method: "POST",
      route: "/v1/emails",
      status_code: 422,
      error_code: "validation_error",
    });
    expect(line.request_id).toMatch(REQUEST_ID);
    expect(await coss.logs.get(line.id)).toEqual({ data: line, error: null });

    const invalid = await coss.logs.list({
      from: "2026-01-02T00:00:00Z",
      to: "2026-01-01T00:00:00Z",
    });
    expect(invalid.error).toMatchObject({ code: "invalid_range", status: 422 });
  });
});
