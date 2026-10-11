/**
 * TypeScript SDK samples for the API reference: each operation maps to the `coss` method that
 * calls it. `test/sdk-samples.test.ts` fails when an operation in apps/api/openapi.json has no
 * sample, or a sample names a method the SDK doesn't have.
 */
import type { RequestData } from "fumadocs-openapi/requests";

/** The example request of an operation, with path parameters filled in. */
export type SampleRequest = RequestData & { url: string };

export interface SdkSample {
  /** The `Coss` method, e.g. `email.send` or `email.suppressions.add`. */
  method: string;
  /** TypeScript source of each argument; trailing `undefined`s are dropped. */
  args: (request: SampleRequest) => (string | undefined)[];
}

/** Keyed by `METHOD /path`, exactly as in the OpenAPI document. */
export const SDK_SAMPLES: Record<string, SdkSample> = {
  "POST /v1/emails": {
    method: "email.send",
    args: (request) => [tsValue(request.body ?? {}), requestOptions(request)],
  },
  "POST /v1/emails/batch": {
    method: "email.sendBatch",
    args: (request) => [tsValue(batchEmails(request.body)), requestOptions(request)],
  },
  "GET /v1/reputation": { method: "reputation.get", args: () => [] },
  "GET /v1/emails/{id}": {
    method: "email.get",
    args: (request) => [pathId(request)],
  },
  "POST /v1/emails/{id}/cancel": {
    method: "email.cancel",
    args: (request) => [pathId(request)],
  },
  "GET /v1/emails/{id}/events": {
    method: "email.listEvents",
    args: (request) => [pathId(request)],
  },
  "GET /v1/emails/{id}/links": {
    method: "email.listLinks",
    args: (request) => [pathId(request)],
  },
  "POST /v1/suppressions": {
    method: "email.suppressions.add",
    args: (request) => [tsValue(request.body ?? {}), requestOptions(request)],
  },
  "GET /v1/suppressions": {
    method: "email.suppressions.list",
    args: (request) => [queryParams(request)],
  },
  "GET /v1/suppressions/check": {
    method: "email.suppressions.check",
    args: (request) => [queryParams(request) ?? "{}"],
  },
  // Before `/v1/suppressions/{id}`, which would also match these paths.
  "POST /v1/suppressions/import": {
    method: "email.suppressions.import",
    args: (request) => [tsValue(request.body ?? {})],
  },
  "GET /v1/suppressions/export": {
    method: "email.suppressions.export",
    args: (request) => [queryParams(request)],
  },
  "GET /v1/suppressions/{id}": { method: "email.suppressions.get", args: (r) => [pathId(r)] },
  "DELETE /v1/suppressions/{id}": { method: "email.suppressions.remove", args: (r) => [pathId(r)] },
  "POST /v1/domains": {
    method: "domains.create",
    args: (request) => [tsValue(request.body ?? {}), requestOptions(request)],
  },
  "GET /v1/domains": { method: "domains.list", args: () => [] },
  "GET /v1/domains/{id}": { method: "domains.get", args: (r) => [pathId(r)] },
  "POST /v1/domains/{id}/verify": {
    method: "domains.verify",
    args: (request) => [pathId(request), requestOptions(request)],
  },
  "DELETE /v1/domains/{id}": { method: "domains.delete", args: (r) => [pathId(r)] },
  "POST /v1/webhook_endpoints": {
    method: "webhookEndpoints.create",
    args: (request) => [tsValue(request.body ?? {}), requestOptions(request)],
  },
  "GET /v1/webhook_endpoints": { method: "webhookEndpoints.list", args: () => [] },
  "GET /v1/webhook_endpoints/{id}": { method: "webhookEndpoints.get", args: (r) => [pathId(r)] },
  "PATCH /v1/webhook_endpoints/{id}": {
    method: "webhookEndpoints.update",
    args: (request) => [pathId(request), tsValue(request.body ?? {})],
  },
  "DELETE /v1/webhook_endpoints/{id}": {
    method: "webhookEndpoints.delete",
    args: (r) => [pathId(r)],
  },
  "GET /v1/webhook_endpoints/{id}/deliveries": {
    method: "webhookEndpoints.deliveries.list",
    args: (request) => [pathId(request), queryParams(request)],
  },
  "GET /v1/webhook_endpoints/{id}/deliveries/{delivery_id}": {
    method: "webhookEndpoints.deliveries.get",
    args: (request) => [pathId(request), pathParam(request, "delivery_id")],
  },
  "POST /v1/webhook_endpoints/{id}/deliveries/{delivery_id}/retry": {
    method: "webhookEndpoints.deliveries.retry",
    args: (request) => [
      pathId(request),
      pathParam(request, "delivery_id"),
      requestOptions(request),
    ],
  },
};

const routes = Object.entries(SDK_SAMPLES).map(([key, sample]) => {
  const [method = "", path = ""] = key.split(" ");
  const pattern = new RegExp(`^${path.replace(/\{[^}]+\}/g, "[^/]+")}$`);
  return { method: method.toLowerCase(), pattern, sample };
});

/** The sample of the operation a request targets, matched by its method and URL path. */
export function findSdkSample(method: string, url: string): SdkSample | undefined {
  const { pathname } = new URL(url, "https://api.coss.com");
  return routes.find(
    (route) => route.method === method.toLowerCase() && route.pattern.test(pathname),
  )?.sample;
}

export function renderSdkSample(request: SampleRequest): string {
  const sample = findSdkSample(request.method, request.url);
  if (!sample) return "// This endpoint is not in the TypeScript SDK yet.";

  const args = sample.args(request);
  while (args.length > 0 && args.at(-1) === undefined) args.pop();
  const { origin } = new URL(request.url, "https://api.coss.com");
  return `import { Coss } from "coss";

const coss = new Coss({
  apiKey: process.env.COSS_API_KEY,
  baseUrl: ${tsValue(origin)},
});

const { data, error } = await coss.${sample.method}(${args.map((arg) => arg ?? "undefined").join(", ")});`;
}

function pathId(request: SampleRequest): string {
  return pathParam(request, "id");
}

function pathParam(request: SampleRequest, name: string): string {
  return tsValue(request.path[name]?.value ?? "");
}

/**
 * The example's query parameters as one params object, or nothing when there are none. They
 * arrive encoded as strings; integers (`limit`) become numbers again, as the SDK types them.
 */
function queryParams(request: SampleRequest): string | undefined {
  const entries = Object.entries(request.query)
    .map(([name, param]) => {
      const values = (param?.values ?? []).map((value) =>
        /^\d+$/.test(value) ? Number(value) : value,
      );
      return [name, values.length > 1 ? values : values[0]] as const;
    })
    .filter(([, value]) => value !== undefined && value !== "");
  return entries.length > 0 ? tsValue(Object.fromEntries(entries)) : undefined;
}

/** `sendBatch` takes the body's `emails` array itself, not `{ emails }`. */
function batchEmails(body: unknown): unknown[] {
  const emails = body !== null && typeof body === "object" && "emails" in body ? body.emails : [];
  return Array.isArray(emails) ? emails : [];
}

function requestOptions(request: SampleRequest): string | undefined {
  const idempotencyKey = Object.entries(request.header).find(
    ([name]) => name.toLowerCase() === "idempotency-key",
  )?.[1]?.value;
  return idempotencyKey ? tsValue({ idempotencyKey }) : undefined;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A value as a TypeScript literal: JSON with bare keys where possible and trailing commas. */
export function tsValue(value: unknown, indent = ""): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((item) => `${inner}${tsValue(item, inner)},\n`).join("")}${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return "{}";
    const lines = entries.map(([key, item]) => {
      const name = IDENTIFIER.test(key) ? key : JSON.stringify(key);
      return `${inner}${name}: ${tsValue(item, inner)},\n`;
    });
    return `{\n${lines.join("")}${indent}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}
