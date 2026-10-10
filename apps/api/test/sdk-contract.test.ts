/**
 * Contract test: the published `coss` SDK (built dist) against the real app, in process.
 * Wire-level drift between the API and the SDK's hand-written types fails here or in
 * contract-types.ts (compile time).
 */
import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss, type CossOptions } from "coss";
import { createTestApp, REQUEST_ID, type TestApp, uniqueDomainName } from "./helpers.ts";

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
    });

    expect(sent.error).toBeNull();
    expect(sent.data).toMatchObject({
      object: "email",
      to: ["user@example.com"],
      cc: ["copy@example.com"],
      headers: { "x-campaign": "fall" },
      tags: [{ name: "category", value: "welcome" }],
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
