/**
 * OpenTelemetry: when `@opentelemetry/api` is installed, every call gets a client span, and the
 * span's context goes out as `traceparent` (through the app's propagator). The API stores it on
 * what the call sends (an email, a text message) and echoes it in its log lines and webhooks, so
 * delivery joins the caller's trace. An optional peer dependency imported once, like React Email's
 * renderer, so the SDK itself keeps zero dependencies; without a registered tracer provider every
 * call below is a no-op.
 */

import { ROUTES } from "./routes.generated.ts";

/** Attribute values the SDK sets. */
type AttributeValue = string | number | boolean;

/** What the SDK needs of a span (`@opentelemetry/api` 1.x's `Span`). */
export interface TracingSpan {
  setAttribute(key: string, value: AttributeValue): unknown;
  setStatus(status: { code: number; message?: string }): unknown;
  end(): void;
}

/** What the SDK needs from `@opentelemetry/api` (any 1.x release fits). */
export interface OpenTelemetryApi {
  trace: {
    getTracer(
      name: string,
      version?: string,
    ): {
      startSpan(
        name: string,
        options?: { kind?: number; attributes?: Record<string, AttributeValue> },
        context?: never,
      ): TracingSpan;
    };
    setSpan(context: never, span: never): unknown;
  };
  context: {
    active(): unknown;
    with<T>(context: never, fn: () => T): T;
  };
  propagation: {
    inject(context: never, carrier: Record<string, string>): void;
  };
  SpanKind: { CLIENT: number };
  SpanStatusCode: { ERROR: number };
}

/** Loads the API; `null` turns tracing off. */
export type TracingLoader = () => Promise<OpenTelemetryApi | null>;

let api: Promise<OpenTelemetryApi | null> | undefined;

/** Imports `@opentelemetry/api` once; `null` when it isn't installed. */
export function loadOpenTelemetry(): Promise<OpenTelemetryApi | null> {
  // A literal specifier inside try/catch: bundlers include the package when it is installed and
  // only warn when it isn't.
  api ??= (async () => {
    try {
      return (await import("@opentelemetry/api")) as unknown as OpenTelemetryApi;
    } catch {
      return null;
    }
  })();
  return api;
}

/** A route template split into segments; `null` stands for a parameter. */
interface Route {
  template: string;
  segments: (string | null)[];
}

let routesBySize: Map<number, Route[]> | undefined;

/** Routes by segment count, the most specific first: more literal segments, then earlier ones. */
function compiledRoutes(): Map<number, Route[]> {
  if (routesBySize) return routesBySize;
  const routes = ROUTES.map((template) => ({
    template,
    segments: template.split("/").map((segment) => (segment.startsWith("{") ? null : segment)),
  }));
  const rank = (route: Route) =>
    route.segments.map((segment) => (segment === null ? 1 : 0)).join("");
  routes.sort((a, b) => {
    const literals = (route: Route) => route.segments.filter((segment) => segment !== null).length;
    return literals(b) - literals(a) || rank(a).localeCompare(rank(b));
  });
  routesBySize = new Map();
  for (const route of routes) {
    const size = routesBySize.get(route.segments.length) ?? [];
    size.push(route);
    routesBySize.set(route.segments.length, size);
  }
  return routesBySize;
}

/**
 * The API route a path is (`/v1/emails/email_01k…/cancel` → `/v1/emails/{id}/cancel`), from the
 * API's own templates, so a span never names an id, alias or address; `null` for a path the API
 * doesn't document (`coss.request()` to a newer endpoint).
 */
export function routeTemplate(path: string): string | null {
  const segments = path.split("?")[0]?.split("/") ?? [];
  const match = compiledRoutes()
    .get(segments.length)
    ?.find((route) =>
      route.segments.every((segment, index) => segment === null || segment === segments[index]),
    );
  return match?.template ?? null;
}

/**
 * The headers of W3C Trace Context, the only ones the API reads (and allows from browsers). Other
 * propagators' (`baggage`, B3, vendors') would fail a browser's preflight, and carry the app's own
 * data to coss.com.
 */
const TRACE_HEADERS: ReadonlySet<string> = new Set(["traceparent", "tracestate"]);

/** How a traced request went, reported by the request pipeline. */
export interface TracedOutcome {
  status: number | null;
  resends: number;
  requestId: string | null;
  error: { type: string; code: string } | null;
}

/**
 * Runs `send` inside a client span named `<METHOD> <route>` (just `<METHOD>` for an unknown path),
 * handing it the W3C trace headers the app's propagator writes for the span's context. Without the
 * API (or with `loader` `null`) `send` runs untraced with no extra headers.
 */
export async function traced<T>(
  loader: TracingLoader | null,
  request: { method: string; path: string; url: string; version: string },
  send: (headers: Record<string, string>) => Promise<{ value: T; outcome: TracedOutcome }>,
): Promise<T> {
  const otel = loader ? await loader() : null;
  if (!otel) return (await send({})).value;
  const template = routeTemplate(request.path);
  // A malformed base URL fails in `fetch` (a `connection_error`), never here.
  let server: Record<string, AttributeValue> = {};
  try {
    const url = new URL(request.url);
    const port = Number(url.port || (url.protocol === "http:" ? 80 : 443));
    server = { "server.address": url.hostname, "server.port": port };
  } catch {
    // Left out.
  }
  const span = otel.trace
    .getTracer("coss", request.version)
    .startSpan(template ? `${request.method} ${template}` : request.method, {
      kind: otel.SpanKind.CLIENT,
      // HTTP client semantic conventions, minus `url.full`: its query (an address filter) and path
      // (an alias, an address) can name people.
      attributes: {
        "http.request.method": request.method,
        ...server,
        ...(template ? { "url.template": template } : {}),
      },
    });
  const context = otel.trace.setSpan(otel.context.active() as never, span as never);
  const carrier: Record<string, string> = {};
  try {
    otel.propagation.inject(context as never, carrier);
  } catch {
    // A broken propagator must not break the call: it goes out without trace headers.
  }
  const headers = Object.fromEntries(
    Object.entries(carrier).filter(([name]) => TRACE_HEADERS.has(name.toLowerCase())),
  );
  try {
    const { value, outcome } = await otel.context.with(context as never, () => send(headers));
    if (outcome.status !== null) span.setAttribute("http.response.status_code", outcome.status);
    if (outcome.resends > 0) span.setAttribute("http.request.resend_count", outcome.resends);
    if (outcome.requestId) span.setAttribute("coss.request_id", outcome.requestId);
    if (outcome.error) {
      span.setAttribute(
        "error.type",
        outcome.status !== null && outcome.status >= 400
          ? String(outcome.status)
          : outcome.error.type,
      );
      span.setAttribute("coss.error.code", outcome.error.code);
      span.setStatus({ code: otel.SpanStatusCode.ERROR, message: outcome.error.code });
    }
    return value;
  } finally {
    span.end();
  }
}
