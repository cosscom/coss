/**
 * Contract test: the published `coss` SDK (built dist) against the real app, in process.
 * Wire-level drift between the API and the SDK's hand-written types fails here or in
 * contract-types.ts (compile time).
 */
import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss, type CossOptions } from "coss";
import { createTestApp, REQUEST_ID, type TestApp } from "./helpers.ts";

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
    const { app, sandboxProvider } = createTestApp();
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
      status: "sent",
      sandbox: true,
    });
    if (!sent.data) throw new Error("send failed");

    const fetched = await coss.email.get(sent.data.id);
    expect(fetched).toEqual({ data: sent.data, error: null });
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("an SDK retry with the same idempotency key does not send twice", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const params = { from: "hello@acme.com", to: "user@example.com", subject: "Hi", text: "Hi" };
    const idempotencyKey = crypto.randomUUID();

    const first = await coss.email.send(params, { idempotencyKey });
    const second = await coss.email.send(params, { idempotencyKey });

    expect(second.data?.id).toBe(first.data?.id ?? "missing");
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
});
