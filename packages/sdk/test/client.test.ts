import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import pkg from "../package.json" with { type: "json" };
import {
  API_VERSION,
  API_VERSIONS,
  Coss,
  type CossError,
  type EmailBatch,
  type EmailEvent,
  type EmailLink,
  type List,
  type SendEmailParams,
  VERSION,
} from "../src/index.ts";
import { apiError, hang, json, mockFetch, networkError, sampleEmail } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const ENV_NAMES = ["COSS_API_KEY", "COSS_BASE_URL"] as const;

const params: SendEmailParams = {
  from: "Acme <onboarding@example.com>",
  to: "delivered@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  tags: [{ name: "category", value: "welcome" }],
};

// Tests must not see a developer's real key (Bun auto-loads .env from the cwd).
const savedEnv: Partial<Record<(typeof ENV_NAMES)[number], string>> = {};
beforeEach(() => {
  for (const name of ENV_NAMES) {
    savedEnv[name] = process.env[name];
    delete process.env[name];
  }
});
afterEach(() => {
  for (const name of ENV_NAMES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
});

describe("new Coss()", () => {
  test("throws without an API key", () => {
    expect(() => new Coss()).toThrow(/Missing coss.com API key/);
    expect(() => new Coss({ apiKey: "  " })).toThrow(/COSS_API_KEY/);
  });

  test("falls back to COSS_API_KEY and COSS_BASE_URL", async () => {
    process.env.COSS_API_KEY = "coss_test_from_env";
    process.env.COSS_BASE_URL = "http://localhost:3001/";
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    await new Coss({ fetch }).email.get(sampleEmail.id);
    expect(calls[0]?.url).toBe(`http://localhost:3001/v1/emails/${sampleEmail.id}`);
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer coss_test_from_env");
  });

  test("explicit options win over the environment", async () => {
    process.env.COSS_API_KEY = "coss_test_from_env";
    process.env.COSS_BASE_URL = "http://env.invalid";
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    await new Coss({ apiKey: API_KEY, baseUrl: "https://api.example.com", fetch }).email.get("x");
    expect(calls[0]?.url).toBe("https://api.example.com/v1/emails/x");
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
  });

  test("defaults to https://api.coss.com", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    await new Coss({ apiKey: API_KEY, fetch }).email.get("x");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/x");
  });

  describe("in a browser-like environment", () => {
    const g = globalThis as { document?: unknown };
    beforeEach(() => {
      g.document = {};
    });
    afterEach(() => {
      delete g.document;
    });

    test("refuses to run by default", () => {
      expect(() => new Coss({ apiKey: API_KEY })).toThrow(/dangerouslyAllowBrowser/);
    });

    test("runs with dangerouslyAllowBrowser", () => {
      expect(new Coss({ apiKey: API_KEY, dangerouslyAllowBrowser: true }).email).toBeDefined();
    });
  });

  test("VERSION matches package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });
});

describe("coss.email.send", () => {
  test("POSTs JSON with auth, User-Agent and an idempotency key, and returns the email", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.send(params);

    expect(result).toEqual({ data: sampleEmail, error: null });
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.method).toBe("POST");
    expect(call?.url).toBe("https://api.coss.com/v1/emails");
    expect(JSON.parse(call?.body ?? "")).toEqual(params);
    expect(call?.headers.get("authorization")).toBe(`Bearer ${API_KEY}`);
    expect(call?.headers.get("user-agent")).toBe(`coss-typescript/${VERSION}`);
    expect(call?.headers.get("content-type")).toBe("application/json");
    expect(call?.headers.get("accept")).toBe("application/json");
    expect(call?.headers.get("idempotency-key")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test("sends attachments as given (base64 JSON)", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const withAttachment = {
      ...params,
      attachments: [{ filename: "a.txt", content: btoa("hi"), content_id: "a@x" }],
    };
    await new Coss({ apiKey: API_KEY, fetch }).email.send(withAttachment);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual(withAttachment);
  });

  test("uses the caller's idempotency key", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    await new Coss({ apiKey: API_KEY, fetch }).email.send(params, { idempotencyKey: "order-42" });
    expect(calls[0]?.headers.get("idempotency-key")).toBe("order-42");
  });

  test("generates a new key per call", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const coss = new Coss({ apiKey: API_KEY, fetch });
    await coss.email.send(params);
    await coss.email.send(params);
    expect(calls[0]?.headers.get("idempotency-key")).not.toBe(
      calls[1]?.headers.get("idempotency-key"),
    );
  });
});

describe("coss.email.sendBatch", () => {
  test("POSTs the emails as one batch with one idempotency key", async () => {
    const batch: EmailBatch = {
      object: "email_batch",
      id: "batch_1",
      data: [sampleEmail],
      created_at: sampleEmail.created_at,
    };
    const { fetch, calls } = mockFetch(json(202, batch));
    const second = { ...params, to: "other@example.com" };
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.sendBatch([params, second], {
      idempotencyKey: "digest-2026-10-10",
    });

    expect(result).toEqual({ data: batch, error: null });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/batch");
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ emails: [params, second] });
    expect(calls[0]?.headers.get("idempotency-key")).toBe("digest-2026-10-10");
  });

  test("generates an idempotency key when none is given", async () => {
    const { fetch, calls } = mockFetch(json(202, { object: "email_batch", data: [] }));
    await new Coss({ apiKey: API_KEY, fetch }).email.sendBatch([params]);
    expect(calls[0]?.headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("coss.email.getBatch", () => {
  test("GETs the batch by id", async () => {
    const batch: EmailBatch = {
      object: "email_batch",
      id: "batch_1",
      data: [sampleEmail],
      created_at: sampleEmail.created_at,
    };
    const { fetch, calls } = mockFetch(json(200, batch));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.getBatch("batch_a/b");

    expect(result).toEqual({ data: batch, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/batch/batch_a%2Fb");
    expect(calls[0]?.body).toBeNull();
  });
});

describe("coss.email.get", () => {
  test("GETs the email by id without a body or idempotency key", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.get("email_a/b?c");

    expect(result).toEqual({ data: sampleEmail, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/email_a%2Fb%3Fc");
    expect(calls[0]?.body).toBeNull();
    expect(calls[0]?.headers.has("idempotency-key")).toBe(false);
    expect(calls[0]?.headers.has("content-type")).toBe(false);
  });
});

describe("coss.email.cancel", () => {
  test("POSTs to the email's cancel route without a body", async () => {
    const canceled = { ...sampleEmail, status: "canceled" as const, sent_at: null };
    const { fetch, calls } = mockFetch(json(200, canceled));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.cancel("email_a/b");

    expect(result).toEqual({ data: canceled, error: null });
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/email_a%2Fb/cancel");
    expect(calls[0]?.body).toBeNull();
  });

  test("an email that is no longer scheduled comes back as an error", async () => {
    const { fetch, calls } = mockFetch(
      apiError(422, { type: "invalid_request_error", code: "email_not_cancelable" }),
    );
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.cancel(sampleEmail.id);

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "email_not_cancelable",
    });
    // A 422 is final: no retry.
    expect(calls).toHaveLength(1);
  });
});

describe("coss.email.reschedule", () => {
  test("POSTs the new time to the email's reschedule route", async () => {
    const scheduled_at = "2026-10-12T09:00:00.000Z";
    const rescheduled = {
      ...sampleEmail,
      status: "scheduled" as const,
      sent_at: null,
      scheduled_at,
    };
    const { fetch, calls } = mockFetch(json(200, rescheduled));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.reschedule("email_a/b", {
      scheduled_at,
    });

    expect(result).toEqual({ data: rescheduled, error: null });
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/email_a%2Fb/reschedule");
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ scheduled_at });
  });

  test("an email that is no longer scheduled comes back as an error", async () => {
    const { fetch, calls } = mockFetch(
      apiError(422, { type: "invalid_request_error", code: "email_not_reschedulable" }),
    );
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.reschedule(sampleEmail.id, {
      scheduled_at: "2026-10-12T09:00:00Z",
    });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "email_not_reschedulable",
    });
    expect(calls).toHaveLength(1);
  });
});

describe("coss.email.listEvents", () => {
  test("GETs the email's events", async () => {
    const list: List<EmailEvent> = {
      object: "list",
      has_more: false,
      data: [
        {
          object: "email_event",
          id: "evt_01k5f9yq8re8vb6q2wmz0tb2xd",
          email_id: sampleEmail.id,
          type: "email.delivered",
          recipient: "delivered@example.com",
          occurred_at: "2026-10-09T12:00:01.000Z",
          data: { delivery: { smtp_response: "250 OK" } },
        },
      ],
    };
    const { fetch, calls } = mockFetch(json(200, list));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.listEvents("email_a/b");

    expect(result).toEqual({ data: list, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/email_a%2Fb/events");
  });
});

describe("coss.email.listLinks", () => {
  test("GETs the email's tracked links", async () => {
    const list: List<EmailLink> = {
      object: "list",
      has_more: false,
      data: [
        {
          object: "email_link",
          id: "lnk_01k5f9yq8re8vb6q2wmz0tb2xd",
          email_id: sampleEmail.id,
          position: 0,
          url: "https://example.com/welcome",
          click_count: 2,
          first_clicked_at: "2026-10-09T12:01:00.000Z",
          last_clicked_at: "2026-10-09T12:05:00.000Z",
        },
      ],
    };
    const { fetch, calls } = mockFetch(json(200, list));
    const result = await new Coss({ apiKey: API_KEY, fetch }).email.listLinks("email_a/b");

    expect(result).toEqual({ data: list, error: null });
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toBe("https://api.coss.com/v1/emails/email_a%2Fb/links");
  });
});

describe("error mapping", () => {
  const cases: [status: number, type: CossError["type"], code: string][] = [
    [400, "invalid_request_error", "invalid_json"],
    [413, "invalid_request_error", "payload_too_large"],
    [422, "invalid_request_error", "validation_error"],
    [401, "authentication_error", "missing_api_key"],
    [401, "authentication_error", "invalid_api_key"],
    [403, "permission_error", "insufficient_permissions"],
    [404, "not_found_error", "not_found"],
    [409, "idempotency_error", "request_in_progress"],
    [422, "idempotency_error", "idempotency_key_reused"],
    [429, "rate_limit_error", "rate_limited"],
    [402, "billing_error", "usage_limit_exceeded"],
    [402, "billing_error", "billing_hold"],
    [500, "api_error", "internal_error"],
    [503, "api_error", "service_unavailable"],
  ];

  test.each(cases)("%i %s / %s", async (status, type, code) => {
    const { fetch } = mockFetch(apiError(status, { type, code }));
    const coss = new Coss({ apiKey: API_KEY, fetch, maxRetries: 0 });
    const result = await coss.email.send(params);
    expect(result).toEqual({
      data: null,
      error: { type, code, message: `${code} message`, status, request_id: "req_envelope" },
    });
  });

  test("copies an optional hint from the envelope", async () => {
    const hint =
      "A live key can only send from a verified domain. https://coss.com/docs/email/domains.md";
    const { fetch } = mockFetch(
      apiError(422, { type: "invalid_request_error", code: "domain_not_verified", hint }),
    );
    const { error } = await new Coss({ apiKey: API_KEY, fetch, maxRetries: 0 }).email.send(params);
    expect(error?.hint).toBe(hint);
  });

  test("keeps param and issues from validation errors", async () => {
    const issues = [{ path: "to", message: "Invalid email address" }];
    const { fetch } = mockFetch(
      apiError(422, {
        type: "invalid_request_error",
        code: "validation_error",
        param: "to",
        issues,
      }),
    );
    const { error } = await new Coss({ apiKey: API_KEY, fetch }).email.send(params);
    expect(error?.param).toBe("to");
    expect(error?.issues).toEqual(issues);
  });

  test("falls back to the X-Request-Id header when the envelope has no request_id", async () => {
    const { fetch } = mockFetch(
      json(404, { error: { type: "not_found_error", code: "not_found", message: "Not found" } }),
    );
    const { error } = await new Coss({ apiKey: API_KEY, fetch }).email.get("x");
    expect(error?.request_id).toBe("req_header");
  });

  test("maps unknown error types to api_error, keeping the code", async () => {
    const { fetch } = mockFetch(apiError(400, { type: "brand_new_error", code: "shiny" }));
    const { error } = await new Coss({ apiKey: API_KEY, fetch }).email.get("x");
    expect(error).toMatchObject({ type: "api_error", code: "shiny", status: 400 });
  });

  test("non-JSON 502 becomes api_error with the header request id", async () => {
    const { fetch } = mockFetch(
      () =>
        new Response("<html>Bad Gateway</html>", {
          status: 502,
          statusText: "Bad Gateway",
          headers: { "Content-Type": "text/html", "X-Request-Id": "req_from_header" },
        }),
    );
    const { data, error } = await new Coss({ apiKey: API_KEY, fetch, maxRetries: 0 }).email.send(
      params,
    );
    expect(data).toBeNull();
    expect(error).toEqual({
      type: "api_error",
      code: "unexpected_response",
      message: "The coss.com API returned an unexpected HTTP 502 (Bad Gateway) response.",
      status: 502,
      request_id: "req_from_header",
    });
  });

  test("a 2xx body that is not JSON becomes api_error / invalid_response", async () => {
    const { fetch } = mockFetch(() => new Response("ok", { status: 200 }));
    const { error } = await new Coss({ apiKey: API_KEY, fetch }).email.get("x");
    expect(error).toMatchObject({ type: "api_error", code: "invalid_response", status: 200 });
  });

  test("network failure becomes connection_error", async () => {
    const { fetch } = mockFetch(networkError);
    const { error } = await new Coss({ apiKey: API_KEY, fetch, maxRetries: 0 }).email.send(params);
    expect(error).toMatchObject({
      type: "connection_error",
      code: "network_error",
      status: null,
      request_id: null,
    });
    expect(error?.message).toContain("ECONNREFUSED");
  });

  test("a slow response becomes timeout_error", async () => {
    const { fetch } = mockFetch(hang);
    const coss = new Coss({ apiKey: API_KEY, fetch, timeout: 20, maxRetries: 0 });
    const { error } = await coss.email.send(params);
    expect(error).toEqual({
      type: "timeout_error",
      code: "request_timeout",
      message: "Request timed out after 20ms.",
      status: null,
      request_id: null,
    });
  });

  test("aborting via the caller's signal returns connection_error / aborted without retrying", async () => {
    const { fetch, calls } = mockFetch(hang);
    const controller = new AbortController();
    const coss = new Coss({ apiKey: API_KEY, fetch, maxRetries: 5 });
    setTimeout(() => controller.abort(), 10);
    const { error } = await coss.email.send(params, { signal: controller.signal });
    expect(error).toMatchObject({ type: "connection_error", code: "aborted", status: null });
    expect(calls).toHaveLength(1);
  });
});

describe("API version", () => {
  test("every request sends Coss-Version: the SDK's API_VERSION, including retries", async () => {
    const { fetch, calls } = mockFetch(json(503, {}), json(200, sampleEmail));
    await new Coss({ apiKey: API_KEY, fetch, maxRetries: 1 }).email.send(params);

    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call.headers.get("coss-version")).toBe(API_VERSION);
    expect(API_VERSIONS).toContain(API_VERSION);
  });

  test("apiVersion overrides it", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const [oldest] = API_VERSIONS;
    await new Coss({ apiKey: API_KEY, fetch, apiVersion: oldest }).email.get("email_x");
    expect(calls[0]?.headers.get("coss-version")).toBe(oldest);
  });
});
