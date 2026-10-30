import { describe, expect, test } from "bun:test";
import { HttpClient } from "../src/core/http.ts";
import { loadOpenTelemetry, type OpenTelemetryApi, routeTemplate } from "../src/core/tracing.ts";
import { Coss } from "../src/index.ts";
import { apiError, json, mockFetch, networkError, sampleEmail } from "./helpers.ts";

const TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

type RecordedSpan = {
  name: string;
  kind: number | undefined;
  attributes: Record<string, unknown>;
  status: { code: number; message?: string } | null;
  ended: boolean;
};

/** A stand-in for `@opentelemetry/api` with a recording tracer and a W3C-style propagator. */
function fakeOtel(
  inject: (carrier: Record<string, string>) => void = (carrier) => {
    carrier.traceparent = TRACEPARENT;
  },
) {
  const spans: RecordedSpan[] = [];
  const active: unknown[] = [];
  const api: OpenTelemetryApi = {
    trace: {
      getTracer: () => ({
        startSpan: (name, options) => {
          const span: RecordedSpan = {
            name,
            kind: options?.kind,
            attributes: { ...options?.attributes },
            status: null,
            ended: false,
          };
          spans.push(span);
          return {
            setAttribute: (key, value) => {
              span.attributes[key] = value;
            },
            setStatus: (status) => {
              span.status = status;
            },
            end: () => {
              span.ended = true;
            },
          };
        },
      }),
      setSpan: (_context, span) => ({ span }),
    },
    context: {
      active: () => ({ root: true }),
      with: (context, fn) => {
        active.push(context);
        return fn();
      },
    },
    propagation: { inject: (_context, carrier) => inject(carrier) },
    SpanKind: { CLIENT: 2 },
    SpanStatusCode: { ERROR: 2 },
  };
  return { api, spans, active };
}

function client(fetch: ReturnType<typeof mockFetch>["fetch"], api: OpenTelemetryApi | null) {
  return new HttpClient({
    apiKey: "coss_test_key",
    baseUrl: "https://api.test",
    fetch,
    timeout: 1_000,
    maxRetries: 2,
    apiVersion: "2026-10-10",
    sleep: async () => {},
    tracing: async () => api,
  });
}

describe("routeTemplate", () => {
  test.each([
    ["/v1/emails", "/v1/emails"],
    ["/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz/cancel", "/v1/emails/{id}/cancel"],
    // A literal segment wins over a parameter in the same place.
    ["/v1/emails/batch", "/v1/emails/batch"],
    ["/v1/emails/batch/batch_01k7c8m4q2f3e9v6t5r1n0p8yz", "/v1/emails/batch/{id}"],
    // Ids that look like words are still ids.
    ["/v1/hooks/applications/alice", "/v1/hooks/applications/{application}"],
    ["/v1/hooks/applications/alice/endpoints", "/v1/hooks/applications/{application}/endpoints"],
    ["/v1/tracking_settings/default", "/v1/tracking_settings/default"],
    ["/v1/tracking_settings/categories/receipts", "/v1/tracking_settings/categories/{category}"],
    ["/v1/emails?limit=10", "/v1/emails"],
  ])("%s → %s", (path, template) => {
    expect(routeTemplate(path)).toBe(template);
  });

  test("paths the API doesn't document have none", () => {
    expect(routeTemplate("/v1/not_yet/alice")).toBeNull();
    expect(routeTemplate("/v1/emails/a/b/c/d")).toBeNull();
  });
});

describe("tracing", () => {
  test("a call gets a client span and sends its context as traceparent", async () => {
    const { fetch, calls } = mockFetch(json(202, sampleEmail));
    const { api, spans, active } = fakeOtel();
    const result = await client(fetch, api).request({
      method: "POST",
      path: "/v1/emails",
      body: {},
    });
    expect(result.error).toBeNull();
    expect(calls[0]?.headers.get("traceparent")).toBe(TRACEPARENT);
    expect(active).toHaveLength(1);
    expect(spans).toEqual([
      {
        name: "POST /v1/emails",
        kind: 2,
        attributes: {
          "http.request.method": "POST",
          "server.address": "api.test",
          "server.port": 443,
          "url.template": "/v1/emails",
          "http.response.status_code": 202,
          "coss.request_id": "req_header",
        },
        status: null,
        ended: true,
      },
    ]);
  });

  test("retries share the span and its traceparent", async () => {
    const { fetch, calls } = mockFetch(
      apiError(503, { type: "api_error", code: "unavailable" }),
      networkError,
      json(202, sampleEmail),
    );
    const { api, spans } = fakeOtel();
    await client(fetch, api).request({ method: "POST", path: "/v1/emails", body: {} });
    expect(calls.map((call) => call.headers.get("traceparent"))).toEqual([
      TRACEPARENT,
      TRACEPARENT,
      TRACEPARENT,
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0]?.attributes["http.request.resend_count"]).toBe(2);
    expect(spans[0]?.status).toBeNull();
  });

  test("a failed call marks the span as an error", async () => {
    const { fetch } = mockFetch(apiError(422, { type: "invalid_request_error", code: "bad" }));
    const { api, spans } = fakeOtel();
    const result = await client(fetch, api).request({ method: "GET", path: "/v1/emails" });
    expect(result.error?.code).toBe("bad");
    expect(spans[0]?.attributes["error.type"]).toBe("422");
    expect(spans[0]?.attributes["coss.error.code"]).toBe("bad");
    expect(spans[0]?.status).toEqual({ code: 2, message: "bad" });
    expect(spans[0]?.ended).toBe(true);
  });

  test("a network failure is an error without a status", async () => {
    const { fetch } = mockFetch(networkError);
    const { api, spans } = fakeOtel();
    await client(fetch, api).request({ method: "GET", path: "/v1/emails" });
    expect(spans[0]?.attributes["error.type"]).toBe("connection_error");
    expect(spans[0]?.attributes["http.response.status_code"]).toBeUndefined();
  });

  test("only W3C trace context goes out, never over the SDK's own headers", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const { api } = fakeOtel((carrier) => {
      carrier.authorization = "Bearer stolen";
      carrier.traceparent = TRACEPARENT;
      carrier.tracestate = "vendor=value";
      carrier.baggage = "user.id=42";
      carrier["sentry-trace"] = "4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-1";
    });
    const result = await client(fetch, api).request({ method: "GET", path: "/v1/emails" });
    expect(result.error).toBeNull();
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer coss_test_key");
    expect(calls[0]?.headers.get("traceparent")).toBe(TRACEPARENT);
    expect(calls[0]?.headers.get("tracestate")).toBe("vendor=value");
    expect(calls[0]?.headers.get("baggage")).toBeNull();
    expect(calls[0]?.headers.get("sentry-trace")).toBeNull();
  });

  test("an invalid trace header is dropped", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const { api } = fakeOtel((carrier) => {
      carrier.traceparent = "bad\nvalue";
    });
    const result = await client(fetch, api).request({ method: "GET", path: "/v1/emails" });
    expect(result.error).toBeNull();
    expect(calls[0]?.headers.get("traceparent")).toBeNull();
  });

  test("a call to an undocumented path is named by its method alone", async () => {
    const { fetch } = mockFetch(json(200, {}));
    const { api, spans } = fakeOtel();
    await client(fetch, api).request({ method: "GET", path: "/v1/not_yet/alice" });
    expect(spans[0]?.name).toBe("GET");
    expect(spans[0]?.attributes).not.toHaveProperty("url.template");
  });

  test("a throwing propagator sends the call without trace headers", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const { api, spans } = fakeOtel(() => {
      throw new Error("broken");
    });
    const result = await client(fetch, api).request({ method: "GET", path: "/v1/emails" });
    expect(result.error).toBeNull();
    expect(calls[0]?.headers.get("traceparent")).toBeNull();
    expect(spans[0]?.ended).toBe(true);
  });

  test("a malformed base URL is a connection error, never a throw", async () => {
    const { api, spans } = fakeOtel();
    const http = new HttpClient({
      apiKey: "coss_test_key",
      baseUrl: "not a url",
      fetch: (input, init) => globalThis.fetch(input, init),
      timeout: 1_000,
      maxRetries: 0,
      apiVersion: "2026-10-10",
      tracing: async () => api,
    });
    const result = await http.request({ method: "GET", path: "/v1/emails" });
    expect(result.error?.type).toBe("connection_error");
    expect(spans[0]?.attributes["server.address"]).toBeUndefined();
  });

  test("without the API nothing is added", async () => {
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    await client(fetch, null).request({ method: "GET", path: "/v1/emails" });
    expect(calls[0]?.headers.get("traceparent")).toBeNull();
  });

  test("the real API loads, and without a registered SDK adds no headers", async () => {
    expect(await loadOpenTelemetry()).not.toBeNull();
    const { fetch, calls } = mockFetch(json(200, sampleEmail));
    const coss = new Coss({ apiKey: "coss_test_key", baseUrl: "https://api.test", fetch });
    const result = await coss.email.get("email_01k7c8m4q2f3e9v6t5r1n0p8yz");
    expect(result.error).toBeNull();
    expect(calls[0]?.headers.get("traceparent")).toBeNull();
  });
});
