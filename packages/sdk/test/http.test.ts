import { describe, expect, test } from "bun:test";
import {
  backoffDelay,
  HttpClient,
  type HttpClientOptions,
  isRetryableStatus,
  parseRetryAfter,
} from "../src/core/http.ts";
import { Coss } from "../src/index.ts";
import {
  apiError,
  type Handler,
  hang,
  json,
  mockFetch,
  networkError,
  sampleEmail,
} from "./helpers.ts";

const serverError = apiError(500, { type: "api_error", code: "internal_error" });
const ok = json(200, sampleEmail);

/** An HttpClient whose backoff is recorded instead of slept. */
function setup(handlers: Handler[], options: Partial<HttpClientOptions> = {}) {
  const { fetch, calls } = mockFetch(...handlers);
  const delays: number[] = [];
  const http = new HttpClient({
    apiKey: "coss_test_key",
    baseUrl: "https://api.test",
    fetch,
    timeout: 1_000,
    maxRetries: 2,
    sleep: async (ms) => {
      delays.push(ms);
    },
    ...options,
  });
  const post = (signal?: AbortSignal) =>
    http.request({ method: "POST", path: "/v1/emails", body: {}, signal });
  return { http, calls, delays, post };
}

describe("retries", () => {
  test.each([
    ["network error", networkError],
    ["timeout", hang],
    ...[409, 429, 500, 503].map(
      (status) =>
        [String(status), apiError(status, { type: "api_error", code: "transient" })] as const,
    ),
  ] as const)("webhook creation does not retry %s", async (_name, handler) => {
    const { fetch, calls } = mockFetch(handler, ok);
    const coss = new Coss({ apiKey: "coss_test_key", fetch, timeout: 10, maxRetries: 3 });
    const result = await coss.webhookEndpoints.create({ url: "https://example.com/hook" });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(calls).toHaveLength(1);
  });

  test("retries a 500, reusing the same Idempotency-Key", async () => {
    const { calls, delays, post } = setup([serverError, ok]);
    const result = await post();

    expect(result).toEqual({ data: sampleEmail, error: null });
    expect(calls).toHaveLength(2);
    const key = calls[0]?.headers.get("idempotency-key");
    expect(key).toBeTruthy();
    expect(calls[1]?.headers.get("idempotency-key")).toBe(key);
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBeGreaterThanOrEqual(375);
    expect(delays[0]).toBeLessThanOrEqual(500);
  });

  test("gives up after maxRetries and returns the last error", async () => {
    const { calls, delays, post } = setup([serverError]);
    const { error } = await post();
    expect(error).toMatchObject({ type: "api_error", code: "internal_error", status: 500 });
    expect(calls).toHaveLength(3);
    expect(delays).toHaveLength(2);
  });

  test("maxRetries: 0 disables retries", async () => {
    const { calls, post } = setup([serverError, ok], { maxRetries: 0 });
    const { error } = await post();
    expect(error?.status).toBe(500);
    expect(calls).toHaveLength(1);
  });

  test.each([400, 401, 403, 404, 413, 422])("does not retry %i", async (status) => {
    const { calls, post } = setup([
      apiError(status, { type: "invalid_request_error", code: "validation_error" }),
      ok,
    ]);
    const { error } = await post();
    expect(error?.status).toBe(status);
    expect(calls).toHaveLength(1);
  });

  test.each([409, 429, 502, 503])("retries %i", async (status) => {
    const { calls, post } = setup([apiError(status, { type: "api_error", code: "x" }), ok]);
    const { data } = await post();
    expect(data).toEqual(sampleEmail);
    expect(calls).toHaveLength(2);
  });

  test("honors Retry-After", async () => {
    const inProgress = apiError(
      409,
      { type: "idempotency_error", code: "request_in_progress" },
      { "Retry-After": "1" },
    );
    const { delays, post } = setup([inProgress, ok]);
    await post();
    expect(delays).toEqual([1_000]);
  });

  test("returns the error instead of waiting out a Retry-After over 60s", async () => {
    const limited = apiError(
      429,
      { type: "rate_limit_error", code: "rate_limited" },
      { "Retry-After": "3600" },
    );
    const { calls, delays, post } = setup([limited, ok]);
    const { error } = await post();
    expect(error?.type).toBe("rate_limit_error");
    expect(calls).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  test("retries network errors and timeouts", async () => {
    const { calls, post } = setup([networkError, hang, ok], { timeout: 10 });
    const { data } = await post();
    expect(data).toEqual(sampleEmail);
    expect(calls).toHaveLength(3);
    expect(new Set(calls.map((c) => c.headers.get("idempotency-key"))).size).toBe(1);
  });

  test("end to end through Coss with the real backoff timer", async () => {
    const retryNow = apiError(503, { type: "api_error", code: "x" }, { "Retry-After": "0" });
    const { fetch, calls } = mockFetch(retryNow, retryNow, ok);
    const coss = new Coss({ apiKey: "coss_test_key", fetch });
    const { data } = await coss.email.send({
      from: "a@example.com",
      to: "b@example.com",
      subject: "s",
      text: "t",
    });
    expect(data).toEqual(sampleEmail);
    expect(calls).toHaveLength(3);
    expect(calls[2]?.headers.get("idempotency-key")).toBe(
      calls[0]?.headers.get("idempotency-key") ?? "",
    );
  });
});

describe("abort", () => {
  test("an already-aborted signal never calls fetch", async () => {
    const { calls, post } = setup([ok]);
    const { error } = await post(AbortSignal.abort());
    expect(error).toMatchObject({ type: "connection_error", code: "aborted" });
    expect(calls).toHaveLength(0);
  });

  test("aborting during backoff stops retrying", async () => {
    const slowRetry = apiError(503, { type: "api_error", code: "x" }, { "Retry-After": "30" });
    const { fetch, calls } = mockFetch(slowRetry, ok);
    // Real sleep: the abort must cut the 30s wait short.
    const http = new HttpClient({
      apiKey: "coss_test_key",
      baseUrl: "https://api.test",
      fetch,
      timeout: 1_000,
      maxRetries: 2,
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    const started = Date.now();
    const { error } = await http.request({
      method: "GET",
      path: "/v1/emails/x",
      signal: controller.signal,
    });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(error).toMatchObject({ type: "connection_error", code: "aborted" });
    expect(calls).toHaveLength(1);
  });

  test("an abort that lands while a retryable response arrives skips the backoff wait", async () => {
    const controller = new AbortController();
    const slowRetry = apiError(503, { type: "api_error", code: "x" }, { "Retry-After": "30" });
    const { fetch, calls } = mockFetch((call) => {
      controller.abort(); // aborted before the client starts its 30s backoff sleep
      return slowRetry(call);
    }, ok);
    const http = new HttpClient({
      apiKey: "coss_test_key",
      baseUrl: "https://api.test",
      fetch,
      timeout: 1_000,
      maxRetries: 2,
    });
    const started = Date.now();
    const { error } = await http.request({
      method: "GET",
      path: "/v1/emails/x",
      signal: controller.signal,
    });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(error).toMatchObject({ type: "connection_error", code: "aborted" });
    expect(calls).toHaveLength(1);
  });

  test("the caller's signal and the timeout both reach fetch", async () => {
    const controller = new AbortController();
    const { calls, post } = setup([hang], { maxRetries: 0, timeout: 10 });
    const { error } = await post(controller.signal);
    expect(error?.type).toBe("timeout_error");
    expect(calls[0]?.signal).not.toBe(controller.signal);
    expect(controller.signal.aborted).toBe(false);
  });
});

describe("helpers", () => {
  test("backoffDelay grows exponentially, is capped at 8s, and jitters down by at most 25%", () => {
    expect(backoffDelay(0, () => 0)).toBe(500);
    expect(backoffDelay(0, () => 1)).toBe(375);
    expect(backoffDelay(1, () => 0)).toBe(1_000);
    expect(backoffDelay(3, () => 0)).toBe(4_000);
    expect(backoffDelay(10, () => 0)).toBe(8_000);
  });

  test("parseRetryAfter reads seconds and HTTP dates", () => {
    const now = Date.parse("2026-10-09T12:00:00Z");
    expect(parseRetryAfter("2", now)).toBe(2_000);
    expect(parseRetryAfter(" 0 ", now)).toBe(0);
    expect(parseRetryAfter("1.5", now)).toBe(1_500);
    expect(parseRetryAfter("Fri, 09 Oct 2026 12:00:03 GMT", now)).toBe(3_000);
    expect(parseRetryAfter("Fri, 09 Oct 2026 11:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter("", now)).toBeNull();
    expect(parseRetryAfter("-1", now)).toBeNull();
    expect(parseRetryAfter("soon", now)).toBeNull();
  });

  test("isRetryableStatus", () => {
    expect([408, 409, 429, 500, 503, 400, 404, 422].map(isRetryableStatus)).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe("headers", () => {
  test("an invalid header value fails fast as invalid_request_error without calling fetch", async () => {
    const { http, calls } = setup([ok]);
    const { error } = await http.request({
      method: "POST",
      path: "/v1/emails",
      body: {},
      idempotencyKey: "заказ-42",
    });
    expect(error).toMatchObject({ type: "invalid_request_error", code: "invalid_header" });
    expect(calls).toHaveLength(0);
  });
});
