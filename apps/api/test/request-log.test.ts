import { describe, expect, test } from "bun:test";
import { memoryLogWriter } from "@coss/logs/testing";
import { Hono } from "hono";
import { requestLog } from "../src/middleware/request-log.ts";
import type { AppEnv } from "../src/types.ts";
import { waitForLogLines } from "./helpers.ts";

function loggedApp(response: () => Response) {
  const writer = memoryLogWriter();
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("attemptedAuth", {
      organizationId: "org_test",
      projectId: "proj_test",
      environmentId: "env_test",
      apiKeyId: "key_test",
      mode: "sandbox",
    });
    c.set("requestId", "req_test");
    c.set("clientIp", null);
    await next();
  });
  app.use("*", requestLog(writer));
  app.get("/v1/example", () => response());
  return { app, writer };
}

const LIMIT = 64 * 1024;

describe("response log byte limit", () => {
  for (const size of [LIMIT - 1, LIMIT, LIMIT + 1]) {
    test(`JSON response of ${size} bytes without Content-Length`, async () => {
      const body = JSON.stringify({ value: "a".repeat(size - 12) });
      expect(new TextEncoder().encode(body).byteLength).toBe(size);
      const { app, writer } = loggedApp(() => Response.json(JSON.parse(body)));
      const response = await app.request("/v1/example");
      expect(response.headers.has("content-length")).toBe(false);
      const [line] = await waitForLogLines(writer, 1);
      const logged = line?.attributes?.response as { body?: unknown };
      expect(Object.hasOwn(logged, "body")).toBe(size <= LIMIT);
      expect(await response.text()).toBe(body);
    });
  }

  test("counts UTF-8 bytes even with an understated Content-Length", async () => {
    const body = JSON.stringify({ value: "é".repeat(LIMIT / 2) });
    const { app, writer } = loggedApp(
      () =>
        new Response(body, {
          headers: { "content-type": "application/json", "content-length": "1" },
        }),
    );
    const response = await app.request("/v1/example");
    const [line] = await waitForLogLines(writer, 1);
    expect(line?.attributes?.response).not.toHaveProperty("body");
    expect(await response.text()).toBe(body);
  });

  test("stops logging an oversized stream before it finishes without cancelling the client", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
        value.enqueue(new TextEncoder().encode('{"value":"'));
        value.enqueue(new Uint8Array(LIMIT).fill(97));
      },
      cancel() {
        cancelled = true;
      },
    });
    const { app, writer } = loggedApp(
      () => new Response(stream, { headers: { "content-type": "application/json" } }),
    );
    const response = await app.request("/v1/example");
    const [line] = await waitForLogLines(writer, 1);
    expect(line?.attributes?.response).not.toHaveProperty("body");
    expect(cancelled).toBe(false);
    controller.enqueue(new TextEncoder().encode('"}'));
    controller.close();
    expect(await response.json()).toEqual({ value: "a".repeat(LIMIT) });
  });
});

for (const path of ["/v1/risk/email/check", "/v1/risk/ip/check", "/v1/risk/content/classify"]) {
  for (const status of [200, 422, 500]) {
    test(`${path} omits both bodies at status ${status}`, async () => {
      const { app, writer } = loggedApp(() => Response.json({}));
      const body = {
        email: "private@example.com",
        canonical: "private@example.com",
        ip: "203.0.113.9",
        scores: { spam: 0.99 },
      };
      app.post(path, async (c) => {
        await c.req.json();
        return Response.json(body, { status });
      });
      const response = await app.request(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(await response.json()).toEqual(body);
      const [line] = await waitForLogLines(writer, 1);
      expect(line?.attributes?.request).not.toHaveProperty("body");
      expect(line?.attributes?.response).not.toHaveProperty("body");
      expect(line?.statusCode).toBe(status);
    });
  }
}
