import { describe, expect, test } from "bun:test";
import spec from "@coss/api/openapi.json" with { type: "json" };
import { deriveSdkSpec, type OpenApiDocument, operationsOf, visitSchemas } from "../src/derive.ts";
import { NO_RETRY, SDK_METHODS } from "../src/methods.ts";

const source = spec as unknown as OpenApiDocument;
const derived = deriveSdkSpec(source);
const operations = operationsOf(derived);

describe("deriveSdkSpec", () => {
  test("names every operation as the TypeScript SDK does", () => {
    expect(operations.size).toBe(Object.keys(SDK_METHODS).length);
    expect(operations.get("POST /v1/emails")).toMatchObject({
      "x-fern-sdk-group-name": "email",
      "x-fern-sdk-method-name": "send",
    });
    expect(operations.get("POST /v1/suppressions")).toMatchObject({
      "x-fern-sdk-group-name": ["email", "suppressions"],
      "x-fern-sdk-method-name": "add",
    });
    expect(operations.get("GET /v1/environment")).toMatchObject({
      "x-fern-sdk-group-name": "environment",
      "x-fern-sdk-method-name": "get",
    });
  });

  test("gives every method a unique name", () => {
    const names = new Set(Object.values(SDK_METHODS));
    expect(names.size).toBe(Object.keys(SDK_METHODS).length);
  });

  test("fails on an operation without an SDK method", () => {
    const doc = structuredClone(source);
    doc.paths["/v1/new_thing"] = { get: { operationId: "getNewThing", responses: {} } };
    expect(() => deriveSdkSpec(doc)).toThrow("GET /v1/new_thing");
  });

  test("fails on a method of an operation that no longer exists", () => {
    const doc = structuredClone(source);
    delete doc.paths["/v1/environment"];
    expect(() => deriveSdkSpec(doc)).toThrow("unknown operations: GET /v1/environment");
  });

  test("turns Coss-Version into one client option defaulting to the latest version", () => {
    expect(JSON.stringify(derived)).not.toContain("#/components/parameters/CossVersion");
    expect(derived.components.parameters?.CossVersion).toBeUndefined();
    expect(derived["x-fern-global-headers"]).toEqual([
      {
        header: "Coss-Version",
        name: "apiVersion",
        optional: true,
        "x-fern-default": source.info.version,
      },
    ]);
  });

  test("reads the API key from COSS_API_KEY", () => {
    expect(derived.components.securitySchemes?.bearerAuth?.["x-fern-bearer"]).toEqual({
      name: "apiKey",
      env: "COSS_API_KEY",
    });
  });

  test("never retries the operations the API doesn't deduplicate", () => {
    for (const [key, operation] of operations) {
      expect([key, operation["x-fern-retries"]]).toEqual([
        key,
        NO_RETRY.has(key) ? { disabled: true } : undefined,
      ]);
    }
  });

  test("makes integers that may exceed 32 bits int64", () => {
    const integers: Record<string, unknown>[] = [];
    visitSchemas(derived, (schema) => {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (types.includes("integer")) integers.push(schema);
    });
    expect(integers.length).toBeGreaterThan(0);
    for (const schema of integers) {
      const max = typeof schema.maximum === "number" ? schema.maximum : Number.POSITIVE_INFINITY;
      if (max > 2 ** 31 - 1) expect(schema.format).toBe("int64");
    }
    const parameters = (operations.get("GET /v1/emails")?.parameters ?? []) as {
      name: string;
      schema: unknown;
    }[];
    const limit = parameters.find((parameter) => parameter.name === "limit");
    expect(limit?.schema).not.toHaveProperty("format");
  });

  test("names the error envelope's body", () => {
    const error = derived.components.schemas.Error as {
      properties: { error: Record<string, unknown> };
    };
    expect(error.properties.error["x-fern-type-name"]).toBe("ErrorBody");
  });

  test("renames schemas named like a resource group for C#", () => {
    const csharp = deriveSdkSpec(source, "csharp");
    expect(csharp.components.schemas.Email).toBeUndefined();
    expect(csharp.components.schemas.EmailMessage).toEqual(
      derived.components.schemas.Email as never,
    );
    expect(JSON.stringify(csharp)).not.toContain('"#/components/schemas/Email"');
    expect(JSON.stringify(csharp)).toContain('"#/components/schemas/EmailMessage"');
    expect(derived.components.schemas.Email).toBeDefined();
  });

  test("leaves the public document unchanged", () => {
    expect(JSON.stringify(source)).not.toContain("x-fern");
  });
});
