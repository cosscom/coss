/**
 * The API reference shows a TypeScript SDK sample for every operation. These tests fail when an
 * endpoint ships without one, or a sample calls a method the SDK doesn't have.
 */
import { describe, expect, test } from "bun:test";
import spec from "@coss/api/openapi.json";
import { Coss } from "coss";
import { renderSdkSample, type SampleRequest, SDK_SAMPLES, tsValue } from "../src/lib/sdk-samples";

const METHODS = ["get", "put", "post", "delete", "patch"] as const;
const operations = Object.entries(spec.paths as Record<string, Record<string, unknown>>).flatMap(
  ([path, item]) =>
    METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${path}`),
);

function request(overrides: Partial<SampleRequest> & Pick<SampleRequest, "method" | "url">) {
  return { path: {}, query: {}, header: {}, cookie: {}, ...overrides } satisfies SampleRequest;
}

describe("SDK samples", () => {
  test("cover exactly the operations in openapi.json", () => {
    expect(operations.length).toBeGreaterThan(0);
    expect(Object.keys(SDK_SAMPLES).sort()).toEqual(operations.sort());
  });

  test("name methods that exist on the client", () => {
    const client = new Coss({ apiKey: "coss_test_docs" });
    for (const { method } of Object.values(SDK_SAMPLES)) {
      const [resource = "", name = ""] = method.split(".");
      const target = (client as unknown as Record<string, Record<string, unknown>>)[resource];
      expect({ method, type: typeof target?.[name] }).toEqual({ method, type: "function" });
    }
  });

  test("render the example request as an SDK call", () => {
    const code = renderSdkSample(
      request({
        method: "post",
        url: "https://api.coss.com/v1/emails",
        header: { "Idempotency-Key": { value: "welcome-user-123" } },
        body: { from: "Acme <hello@acme.com>", to: ["a@example.com"], "x-y": 1 },
      }),
    );
    expect(code).toContain('import { Coss } from "coss";');
    expect(code).toEndWith(`const { data, error } = await coss.email.send({
  from: "Acme <hello@acme.com>",
  to: [
    "a@example.com",
  ],
  "x-y": 1,
}, {
  idempotencyKey: "welcome-user-123",
});`);
  });

  test("match path parameters and leave out absent options", () => {
    const code = renderSdkSample(
      request({
        method: "get",
        url: "https://api.coss.com/v1/emails/email_123/events",
        path: { id: { value: "email_123" } },
      }),
    );
    expect(code).toEndWith('await coss.email.listEvents("email_123");');
  });

  test.each(["http://localhost:3001", "https://api.coss.com", "https://api.example.com:8443"])(
    "use the selected API origin %s in the client setup",
    async (origin) => {
      const code = renderSdkSample(
        request({
          method: "get",
          url: `${origin}/v1/emails/email_123?example=true`,
          path: { id: { value: "email_123" } },
        }),
      );
      const urls: string[] = [];
      class TestCoss extends Coss {
        constructor(options: ConstructorParameters<typeof Coss>[0]) {
          super({
            ...options,
            apiKey: "coss_test_docs",
            fetch: async (input) => {
              urls.push(String(input));
              return Response.json({ id: "email_123" });
            },
          });
        }
      }
      const run = new Function(
        "Coss",
        `return (async () => { ${code.replace('import { Coss } from "coss";', "")} })();`,
      );
      await run(TestCoss);
      expect(urls).toEqual([`${origin}/v1/emails/email_123`]);
    },
  );

  test("say so for endpoints the SDK doesn't cover", () => {
    const code = renderSdkSample(request({ method: "delete", url: "https://api.coss.com/v1/x" }));
    expect(code).toStartWith("//");
  });

  test("tsValue escapes strings and quotes non-identifier keys", () => {
    expect(tsValue({ a: 'say "hi"', "b-c": [], d: {} })).toBe(
      '{\n  a: "say \\"hi\\"",\n  "b-c": [],\n  d: {},\n}',
    );
  });
});
