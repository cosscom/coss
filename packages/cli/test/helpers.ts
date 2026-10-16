import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CliIo, Fetch } from "../src/io.ts";

export const SANDBOX_KEY = `coss_test_${"a".repeat(64)}`;
export const LIVE_KEY = `coss_live_${"b".repeat(64)}`;
export const NOW = new Date("2026-10-15T12:00:00.000Z");

export type Recorded = { method: string; url: URL; body: unknown; headers: Headers };
type Handler = ((request: Recorded) => unknown) | object;

/** A `fetch` answering "METHOD /path" routes (JSON), recording every request. */
export function fakeFetch(routes: Record<string, Handler>) {
  const requests: Recorded[] = [];
  const fetch: Fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init.method ?? "GET";
    const text = typeof init.body === "string" ? init.body : null;
    const recorded = {
      method,
      url,
      body: text ? (JSON.parse(text) as unknown) : null,
      headers: new Headers(init.headers),
    };
    requests.push(recorded);
    const handler =
      routes[`${method} ${url.pathname}`] ?? routes[`${method} ${url.origin}${url.pathname}`];
    if (!handler) {
      return Response.json(
        {
          error: {
            type: "not_found_error",
            code: "not_found",
            message: "Not found.",
            request_id: "req_test",
          },
        },
        { status: 404 },
      );
    }
    const result = typeof handler === "function" ? await handler(recorded) : handler;
    return result instanceof Response ? result : Response.json(result);
  };
  return { fetch, requests };
}

export function apiError(status: number, type: string, code: string, message = code): Response {
  return Response.json({ error: { type, code, message, request_id: "req_test" } }, { status });
}

export type TestIo = CliIo & {
  output(): string;
  errors(): string;
  controller: AbortController;
};

/** An io writing to strings, with a fresh config directory and no real network or browser. */
export function testIo(overrides: Partial<CliIo> & { answers?: string[] } = {}): TestIo {
  let stdout = "";
  let stderr = "";
  const controller = new AbortController();
  const answers = [...(overrides.answers ?? [])];
  const io: TestIo = {
    env: {},
    stdout: {
      write: (text) => {
        stdout += text;
      },
    },
    stderr: {
      write: (text) => {
        stderr += text;
      },
    },
    stdinIsTTY: false,
    fetch: async () => {
      throw new Error("no network in tests");
    },
    now: () => NOW,
    sleep: (ms, signal) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, Math.min(ms, 5));
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve();
        });
      }),
    openBrowser: async () => false,
    prompt: async (question) => {
      stderr += question;
      return answers.shift() ?? "";
    },
    hostname: () => "test-host",
    configDir: mkdtempSync(join(tmpdir(), "coss-cli-test-")),
    signal: controller.signal,
    output: () => stdout,
    errors: () => stderr,
    controller,
    ...overrides,
  };
  return io;
}

export function environmentObject(mode: "live" | "sandbox" = "sandbox") {
  return {
    object: "environment",
    id: mode === "live" ? "env_live" : "env_dev",
    name: mode === "live" ? "Production" : "Development",
    slug: mode === "live" ? "production" : "development",
    mode,
    project: { id: "proj_1", name: "Default", slug: "default" },
    organization: { id: "org_1", name: "Acme", slug: "acme", api_version: "2026-10-01" },
    api_key: { id: "key_1", name: "coss CLI · test-host", start: "coss_test_aa" },
  };
}
