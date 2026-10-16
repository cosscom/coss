import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { verifyWebhook } from "coss";
import { readConfig } from "../src/config.ts";
import { normalizeTarget } from "../src/listen/forward.ts";
import { run } from "../src/run.ts";
import { apiError, environmentObject, fakeFetch, NOW, SANDBOX_KEY, testIo } from "./helpers.ts";

const servers: Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

/** A local receiver like the app `coss listen` forwards to. */
async function receiver(status = 200) {
  const received: { headers: IncomingHttpHeaders; body: string }[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      received.push({ headers: request.headers, body });
      response.writeHead(status).end("ok");
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/hooks`, received };
}

const listenerObject = {
  object: "webhook_listener",
  id: "whlis_1",
  api_version: "2026-10-01",
  event_types: [],
  description: "test-host → x",
  expires_at: "2026-10-15T12:10:00.000Z",
  created_at: "2026-10-15T12:00:00.000Z",
};

const event = {
  id: "evt_1",
  object: "event",
  type: "email.delivered",
  api_version: "2026-10-01",
  data: { email_id: "email_1" },
};

function delivery(id = "whlisdel_1") {
  return {
    object: "webhook_listener_delivery",
    id,
    ack_token: "tok",
    event_id: "evt_1",
    event_type: "email.delivered",
    attempt: 1,
    body: JSON.stringify(event),
    created_at: "2026-10-15T12:00:01.000Z",
  };
}

describe("coss listen", () => {
  test("normalizes targets", () => {
    expect(normalizeTarget("localhost:3000/webhooks")).toBe("http://localhost:3000/webhooks");
    expect(normalizeTarget(":3000/x")).toBe("http://localhost:3000/x");
    expect(normalizeTarget("3000")).toBe("http://localhost:3000/");
    expect(normalizeTarget("https://example.test/h")).toBe("https://example.test/h");
    expect(() => normalizeTarget("ftp://x")).toThrow();
  });

  test("forwards events signed with the profile's secret, acknowledges them and closes on Ctrl-C", async () => {
    const local = await receiver();
    const polls: unknown[] = [];
    const io = testIo({ answers: [SANDBOX_KEY] });
    const answers = [[delivery()], []];
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "POST /v1/webhook_listeners": ({ body }) => {
        expect(body).toEqual({
          event_types: ["email.delivered"],
          api_version: "2026-10-01",
          description: `test-host → ${local.url}`,
        });
        return listenerObject;
      },
      "POST /v1/webhook_listeners/whlis_1/poll": ({ body }) => {
        polls.push(body);
        const deliveries = answers.shift();
        if (!deliveries) io.controller.abort();
        return {
          object: "webhook_listener_poll",
          listener: listenerObject,
          deliveries: deliveries ?? [],
          acknowledged: 0,
        };
      },
      "DELETE /v1/webhook_listeners/whlis_1": {
        object: "webhook_listener",
        id: "whlis_1",
        deleted: true,
      },
    });
    // The API is fake; the local receiver is real.
    io.fetch = (input, init) =>
      String(input).startsWith(local.url) ? fetch(input, init) : api.fetch(input, init);
    expect(await run(["login", "--manual"], io)).toBe(0);

    expect(
      await run(
        ["listen", "--forward-to", local.url, "--events", "email.delivered", "-H", "X-Test: a, b"],
        io,
      ),
    ).toBe(130);
    expect(local.received).toHaveLength(1);
    const [forwarded] = local.received;
    expect(forwarded?.body).toBe(JSON.stringify(event));
    expect(forwarded?.headers["x-test"]).toBe("a, b");
    expect(forwarded?.headers["webhook-id"]).toBe("evt_1");
    const secret = (await readConfig(io)).profiles.default?.listen_secret ?? "";
    expect(io.errors()).toContain(secret);
    expect(
      await verifyWebhook(
        forwarded?.body ?? "",
        {
          "webhook-id": String(forwarded?.headers["webhook-id"]),
          "webhook-timestamp": String(forwarded?.headers["webhook-timestamp"]),
          "webhook-signature": String(forwarded?.headers["webhook-signature"]),
        },
        secret,
        // The test clock is fixed in the past.
        { toleranceSeconds: Number.MAX_SAFE_INTEGER },
      ),
    ).toMatchObject({ id: "evt_1" });

    expect(polls[1]).toEqual({
      acks: [
        {
          delivery_id: "whlisdel_1",
          ack_token: "tok",
          status_code: 200,
          duration_ms: expect.any(Number),
          error: null,
        },
      ],
      wait_ms: 20000,
      limit: 10,
    });
    expect(api.requests.at(-1)?.method).toBe("DELETE");
    expect(io.output()).toContain("email.delivered evt_1 [200]");
  });

  test("reports a local server that isn't there, and reopens an expired listener", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    let created = 0;
    const answers: (unknown[] | "expired")[] = ["expired", [delivery()]];
    const polls: { acks?: { error: string | null }[] }[] = [];
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "POST /v1/webhook_listeners": () => {
        created++;
        return listenerObject;
      },
      "POST /v1/webhook_listeners/whlis_1/poll": ({ body }) => {
        polls.push(body as never);
        const next = answers.shift();
        if (next === "expired") return apiError(404, "not_found_error", "not_found");
        if (!next) io.controller.abort();
        return {
          object: "webhook_listener_poll",
          listener: listenerObject,
          deliveries: next ?? [],
          acknowledged: 0,
        };
      },
      "DELETE /v1/webhook_listeners/whlis_1": {
        object: "webhook_listener",
        id: "whlis_1",
        deleted: true,
      },
    });
    io.fetch = async (input, init) => {
      if (String(input).startsWith("http://127.0.0.1:9/")) {
        throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
      }
      return api.fetch(input, init);
    };
    expect(await run(["listen", "--forward-to", "127.0.0.1:9/hooks"], io)).toBe(130);
    expect(created).toBe(2);
    expect(io.errors()).toContain("listener had expired");
    expect(io.output()).toContain("connection refused");
    expect(polls.at(-1)?.acks?.[0]?.error).toBe("connection refused");
  });

  test("with --json and COSS_API_KEY, the (unsaved) secret still goes to stderr", async () => {
    const local = await receiver();
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    const answers = [[delivery()]];
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "POST /v1/webhook_listeners": listenerObject,
      "POST /v1/webhook_listeners/whlis_1/poll": () => {
        const next = answers.shift();
        if (!next) io.controller.abort();
        return {
          object: "webhook_listener_poll",
          listener: listenerObject,
          deliveries: next ?? [],
          acknowledged: 0,
        };
      },
      "DELETE /v1/webhook_listeners/whlis_1": {
        object: "webhook_listener",
        id: "whlis_1",
        deleted: true,
      },
    });
    io.fetch = (input, init) =>
      String(input).startsWith(local.url) ? fetch(input, init) : api.fetch(input, init);
    expect(await run(["listen", "--json", "--forward-to", local.url], io)).toBe(130);
    const secret = /Signing secret: (whsec_\S+)/.exec(io.errors())?.[1];
    expect(secret).toBeTruthy();
    const [request] = local.received;
    const headers = Object.fromEntries(
      Object.entries(request?.headers ?? {}).map(([name, value]) => [name, String(value)]),
    );
    expect(
      await verifyWebhook(request?.body ?? "", headers, secret ?? "", { now: NOW }),
    ).toMatchObject({
      id: "evt_1",
    });
    // stdout stays one JSON object per line.
    for (const text of io.output().trim().split("\n")) expect(() => JSON.parse(text)).not.toThrow();
  });

  test("refuses live environments without --live", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    io.fetch = fakeFetch({ "GET /v1/environment": environmentObject("live") }).fetch;
    expect(await run(["listen"], io)).toBe(1);
    expect(io.errors()).toContain("Pass --live");
  });
});
