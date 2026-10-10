/**
 * TypeScript SDK samples for the API reference: each operation maps to the `coss` method that
 * calls it. `test/sdk-samples.test.ts` fails when an operation in apps/api/openapi.json has no
 * sample, or a sample names a method the SDK doesn't have.
 */
import type { RequestData } from "fumadocs-openapi/requests";

/** The example request of an operation, with path parameters filled in. */
export type SampleRequest = RequestData & { url: string };

export interface SdkSample {
  /** The `Coss` method, e.g. `email.send`. */
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
  "GET /v1/emails/{id}": {
    method: "email.get",
    args: (request) => [tsValue(request.path.id?.value ?? "")],
  },
  "GET /v1/emails/{id}/events": {
    method: "email.listEvents",
    args: (request) => [tsValue(request.path.id?.value ?? "")],
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
