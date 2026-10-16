import { describe, expect, test } from "bun:test";
import type { Log } from "coss";
import { LogTail, parseSince } from "../src/logs/tail.ts";
import { run } from "../src/run.ts";
import {
  apiError,
  environmentObject,
  fakeFetch,
  NOW,
  type Recorded,
  SANDBOX_KEY,
  testIo,
} from "./helpers.ts";

function line(id: string, at: string, overrides: Partial<Log> = {}): Log {
  return {
    object: "log",
    id,
    occurred_at: at,
    source: "email",
    level: "info",
    type: "email.delivered",
    message: `delivered ${id}`,
    request_id: null,
    api_key_id: null,
    method: null,
    path: null,
    route: null,
    status_code: null,
    duration_ms: null,
    client_ip: null,
    user_agent: null,
    error_code: null,
    resource_type: null,
    resource_id: null,
    recipient: null,
    attributes: {},
    ...overrides,
  };
}

describe("LogTail", () => {
  test("hands back unseen lines oldest first, and reads again a minute before the newest", () => {
    const tail = new LogTail(NOW);
    expect(tail.windowStart().toISOString()).toBe("2026-10-15T11:59:00.000Z");
    const b = line("log_b", "2026-10-15T12:00:02.000Z");
    const a = line("log_a", "2026-10-15T12:00:01.000Z");
    expect(tail.take([b, a]).map((l) => l.id)).toEqual(["log_a", "log_b"]);
    expect(tail.take([b, a])).toEqual([]);
    // A late line with an earlier time is still new.
    expect(
      tail.take([b, line("log_late", "2026-10-15T12:00:00.500Z"), a]).map((l) => l.id),
    ).toEqual(["log_late"]);
    expect(tail.windowStart().toISOString()).toBe("2026-10-15T11:59:02.000Z");
  });

  test("--since takes durations or ISO times", () => {
    expect(parseSince("15m", NOW)?.toISOString()).toBe("2026-10-15T11:45:00.000Z");
    expect(parseSince("2026-10-15T10:00:00Z", NOW)?.toISOString()).toBe("2026-10-15T10:00:00.000Z");
    expect(parseSince("soon", NOW)).toBeNull();
  });
});

describe("coss logs tail", () => {
  test("prints only lines that arrive after it starts, with the filters", async () => {
    const pages = [
      // One line was there already; one landed while the tail was starting.
      [line("log_old", "2026-10-15T11:59:50.000Z"), line("log_racing", "2026-10-15T12:00:00.500Z")],
      [
        line("log_new", "2026-10-15T12:00:03.000Z", {
          source: "api",
          type: "api.request",
          method: "POST",
          path: "/v1/emails",
          status_code: 202,
          duration_ms: 12,
        }),
        line("log_old", "2026-10-15T11:59:50.000Z"),
      ],
    ];
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "GET /v1/logs": () => {
        const data = pages.shift();
        if (!data) io.controller.abort();
        return { object: "list", data: data ?? [], has_more: false };
      },
    });
    io.fetch = api.fetch;
    expect(
      await run(["logs", "tail", "--source", "api,email", "--level", "error", "-q", "bounce"], io),
    ).toBe(130);
    expect(io.output()).not.toContain("log_old");
    expect(io.output()).toContain("delivered log_racing");
    expect(io.output()).toContain("api.request POST /v1/emails 202 12ms");
    const query = api.requests.find((r) => r.url.pathname === "/v1/logs")?.url.searchParams;
    expect(query?.get("source")).toBe("api,email");
    expect(query?.get("level")).toBe("error");
    expect(query?.get("q")).toBe("bounce");
    expect(query?.get("limit")).toBe("100");
  });

  test("reads the whole window, so a late line behind a page already printed still shows", async () => {
    const page = (n: number, offsetMs: number) =>
      Array.from({ length: n }, (_, i) =>
        line(`log_${offsetMs}_${i}`, new Date(NOW.getTime() + offsetMs - i).toISOString()),
      );
    // Everything is older than the tail's start; the late line also arrives after it.
    const newest = page(100, -5_000);
    const older = page(3, -10_000);
    const late = line("log_late", "2026-10-15T11:59:52.000Z");
    // Each poll answers newest first, 100 a page; the late line arrives after the first poll.
    let polls = 0;
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "GET /v1/logs": (request: Recorded) => {
        const after = request.url.searchParams.get("after");
        if (!after) {
          polls++;
          if (polls > 3) io.controller.abort();
          return { object: "list", data: newest, has_more: true };
        }
        return { object: "list", data: polls >= 3 ? [...older, late] : older, has_more: false };
      },
    });
    io.fetch = api.fetch;
    expect(await run(["logs", "tail", "--json"], io)).toBe(130);
    const printed = io
      .output()
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((text) => (JSON.parse(text) as { id: string }).id);
    expect(printed).toEqual(["log_late"]);
  });

  test("--since stays the lower bound of every poll", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    let polls = 0;
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "GET /v1/logs": () => {
        if (++polls > 2) io.controller.abort();
        return { object: "list", data: [], has_more: false };
      },
    });
    io.fetch = api.fetch;
    expect(await run(["logs", "tail", "--since", "30s"], io)).toBe(130);
    const froms = api.requests
      .filter((r) => r.url.pathname === "/v1/logs")
      .map((r) => r.url.searchParams.get("from"));
    expect(new Set(froms)).toEqual(new Set(["2026-10-15T11:59:30.000Z"]));
  });

  test("stops on an error retrying can't fix", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    const answers = [
      apiError(503, "api_error", "unavailable"),
      apiError(422, "invalid_request_error", "validation_error", "status: Invalid input"),
    ];
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "GET /v1/logs": () => answers.shift() ?? io.controller.abort(),
    });
    io.fetch = api.fetch;
    expect(await run(["logs", "tail", "--status", "nope"], io)).toBe(1);
    expect(io.errors()).toContain("status: Invalid input");
    // The 503 is retried (by the SDK); the 422 ends the tail.
    expect(api.requests.filter((r) => r.url.pathname === "/v1/logs")).toHaveLength(2);
  });

  test("rejects unknown sources", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["logs", "tail", "--source", "nope"], io)).toBe(2);
  });
});
