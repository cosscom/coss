import { describe, expect, test } from "bun:test";
import { gzipSync } from "node:zlib";
import { ProviderError, providerClient } from "../src/http.ts";
import type { SourceDeps } from "../src/sources/deps.ts";
import { checkCredentials, createSource } from "../src/sources/index.ts";

type Handler = (request: {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}) => Response | undefined;

/** A `fetch` answering from `routes` ("GET /path?query" → JSON, or a handler); records requests. */
function fakeFetch(routes: Record<string, unknown>, fallback?: Handler) {
  const requests: { method: string; url: string; headers: Headers }[] = [];
  const fetch = async (input: string, init: RequestInit) => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    requests.push({ method, url: url.href, headers });
    const key = `${method} ${url.host}${url.pathname}${url.search}`;
    const short = `${method} ${url.pathname}${url.search}`;
    const route = routes[key] ?? routes[short];
    if (route !== undefined) {
      return route instanceof Response ? route : Response.json(route);
    }
    const handled = fallback?.({
      method,
      url,
      headers,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return handled ?? new Response("not found", { status: 404 });
  };
  return { fetch, requests };
}

const fast: SourceDeps = { sleep: async () => {} };

describe("providerClient", () => {
  test("retries throttling and server errors, then reports what the provider said", async () => {
    let calls = 0;
    const client = providerClient({
      ...fast,
      name: "Test",
      baseUrl: "https://api.test",
      headers: { authorization: "Bearer secret-key" },
      minIntervalMs: 0,
      fetch: async () => {
        calls++;
        if (calls === 1) return new Response("", { status: 429, headers: { "retry-after": "1" } });
        if (calls === 2) return new Response("", { status: 503 });
        return Response.json({ ok: true });
      },
    });
    expect(await client.get<{ ok: boolean }>("/x")).toEqual({ ok: true });
    expect(calls).toBe(3);

    const refusing = providerClient({
      ...fast,
      name: "Test",
      baseUrl: "https://api.test",
      headers: { authorization: "Bearer secret-key" },
      minIntervalMs: 0,
      fetch: async () => Response.json({ message: "API key is invalid" }, { status: 401 }),
    });
    const error = await refusing.get("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({
      code: "unauthorized",
      message: "Test answered 401: API key is invalid",
    });
    expect(String((error as Error).message)).not.toContain("secret-key");
  });

  test("concurrent requests keep their spacing", async () => {
    const starts: number[] = [];
    const client = providerClient({
      name: "Test",
      baseUrl: "https://api.test",
      headers: {},
      minIntervalMs: 40,
      fetch: async () => {
        starts.push(performance.now());
        return Response.json({});
      },
    });
    await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);
    const sorted = starts.sort((a, b) => a - b);
    expect((sorted[1] ?? 0) - (sorted[0] ?? 0)).toBeGreaterThanOrEqual(35);
    expect((sorted[2] ?? 0) - (sorted[1] ?? 0)).toBeGreaterThanOrEqual(35);
  });

  test("a long wait isn't slept through: it's a rate_limited error with a time", async () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const client = providerClient({
      ...fast,
      now: () => now,
      name: "Test",
      baseUrl: "https://api.test",
      headers: {},
      minIntervalMs: 0,
      fetch: async () => new Response("", { status: 429, headers: { "retry-after": "120" } }),
    });
    const error = await client.get("/x").catch((e: unknown) => e);
    expect(error).toMatchObject({ code: "rate_limited", retryAt: new Date(now + 120_000) });
  });
});

describe("Resend", () => {
  test("pages lists, reads contacts' properties and topics, maps webhooks", async () => {
    const { fetch, requests } = fakeFetch({
      "GET /domains?limit=100": {
        data: [{ id: "d1", name: "acme.com", status: "verified" }],
        has_more: true,
      },
      "GET /domains?limit=100&after=d1": {
        data: [{ id: "d2", name: "b.com", status: "pending" }],
        has_more: false,
      },
      "GET /contact-properties?limit=100": {
        data: [{ id: "p1", key: "plan", type: "string", fallback_value: null }],
      },
      "GET /topics?limit=100": {
        data: [{ id: "t1", name: "News", default_subscription: "opt_out", visibility: "private" }],
      },
      "GET /contacts?limit=20": {
        data: [{ id: "c1", email: "ada@example.com", first_name: "Ada", unsubscribed: false }],
        has_more: false,
      },
      "GET /contacts/c1": {
        id: "c1",
        email: "ada@example.com",
        properties: { plan: { value: "pro", type: "string" } },
      },
      "GET /contacts/c1/topics?limit=100": { data: [{ id: "t1", subscription: "opt_in" }] },
      "GET /webhooks?limit=100": {
        data: [
          { id: "w1", endpoint: "https://x.test/h", events: ["email.bounced", "domain.created"] },
        ],
      },
      "GET /suppressions?limit=100": new Response("{}", { status: 403 }),
    });
    const source = createSource(
      { provider: "resend", apiKey: "re_key", options: {} },
      { ...fast, fetch },
    );
    expect((await source.domains()).map((d) => [d.name, d.verified])).toEqual([
      ["acme.com", true],
      ["b.com", false],
    ]);
    expect(await source.contacts(null)).toEqual({
      items: [
        {
          email: "ada@example.com",
          firstName: "Ada",
          lastName: null,
          unsubscribed: false,
          properties: { plan: "pro" },
          topics: [{ topicId: "t1", status: "opted_in" }],
        },
      ],
      next: null,
    });
    expect(await source.webhooks()).toMatchObject([
      { url: "https://x.test/h", eventTypes: ["email.bounced"], unmapped: ["domain.created"] },
    ]);
    // The beta suppression API isn't there: nothing to import.
    expect(await source.suppressions(null)).toEqual({ items: [], next: null });
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer re_key");
    expect(requests[0]?.headers.get("user-agent")).toContain("coss.com");
  });

  test("tells a sending-only key apart from a wrong one", async () => {
    const restricted = fakeFetch({
      "GET /domains?limit=1": Response.json(
        { name: "restricted_api_key", message: "This API key is restricted to only send emails" },
        { status: 401 },
      ),
    });
    await expect(
      checkCredentials("resend", "re_x", {}, { ...fast, fetch: restricted.fetch }),
    ).rejects.toMatchObject({ message: expect.stringContaining("full access") });
    // Resend answers an unknown key with a 400.
    const invalid = fakeFetch({
      "GET /domains?limit=1": Response.json(
        { name: "validation_error", message: "API key is invalid" },
        { status: 400 },
      ),
    });
    await expect(
      checkCredentials("resend", "re_x", {}, { ...fast, fetch: invalid.fetch }),
    ).rejects.toMatchObject({
      code: "unauthorized",
      message: "Resend didn't accept this API key.",
    });
    const ok = fakeFetch({ "GET /domains?limit=1": { data: [] } });
    expect(await checkCredentials("resend", "re_x", {}, { ...fast, fetch: ok.fetch })).toEqual({
      ok: true,
      options: {},
      account: null,
    });
  });
});

describe("SendGrid", () => {
  test("falls back to the EU host for EU keys", async () => {
    const { fetch } = fakeFetch({
      "GET api.sendgrid.com/v3/scopes": new Response("{}", { status: 401 }),
      "GET api.eu.sendgrid.com/v3/scopes": { scopes: [] },
    });
    expect(await checkCredentials("sendgrid", "SG.x", {}, { ...fast, fetch })).toMatchObject({
      ok: true,
      options: { region: "eu" },
    });
  });

  test("exports contacts, waits while the export is pending, reads gzip CSV files", async () => {
    let polls = 0;
    const csv =
      "EMAIL,FIRST_NAME,LAST_NAME,plan,seats\r\nada@example.com,Ada,,pro,3\r\nbob@example.com,,,,\r\n";
    const { fetch, requests } = fakeFetch(
      {
        "GET /v3/marketing/field_definitions": {
          custom_fields: [
            { id: "e1", name: "plan", field_type: "Text" },
            { id: "e2", name: "seats", field_type: "Number" },
          ],
        },
      },
      ({ method, url }) => {
        if (method === "POST" && url.pathname === "/v3/marketing/contacts/exports") {
          return Response.json({ id: "exp1" }, { status: 202 });
        }
        if (url.pathname === "/v3/marketing/contacts/exports/exp1") {
          polls++;
          return Response.json(
            polls === 1
              ? { status: "pending" }
              : { status: "ready", urls: ["https://files.test/1.csv.gz"] },
          );
        }
        return undefined;
      },
    );
    const now = 1_000_000;
    const source = createSource(
      { provider: "sendgrid", apiKey: "SG.key", options: { region: "global" } },
      {
        ...fast,
        fetch,
        now: () => now,
        download: async (url) => {
          expect(url).toBe("https://files.test/1.csv.gz");
          return new Uint8Array(gzipSync(csv));
        },
      },
    );
    const started = await source.contacts(null);
    expect(started.items).toEqual([]);
    expect(started.retryAt).toEqual(new Date(now + 10_000));
    const pending = await source.contacts(started.next);
    expect(pending.items).toEqual([]);
    const ready = await source.contacts(pending.next);
    expect(ready.next).toBeNull();
    expect(ready.items).toEqual([
      {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: null,
        unsubscribed: false,
        properties: { plan: "pro", seats: 3 },
        topics: [],
      },
      {
        email: "bob@example.com",
        firstName: null,
        lastName: null,
        unsubscribed: false,
        properties: { plan: null, seats: null },
        topics: [],
      },
    ]);
    expect(requests.some((r) => r.method === "POST")).toBe(true);
  });

  test("reads every suppression list, then each unsubscribe group", async () => {
    const page = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ email: `b${i}@example.com`, created: 1700000000 }));
    const { fetch } = fakeFetch({
      "GET /v3/suppression/bounces?limit=500&offset=0": page(500),
      "GET /v3/suppression/bounces?limit=500&offset=500": page(1),
      "GET /v3/suppression/invalid_emails?limit=500&offset=0": [],
      "GET /v3/suppression/spam_reports?limit=500&offset=0": [{ email: "s@example.com" }],
      "GET /v3/suppression/unsubscribes?limit=500&offset=0": [],
      "GET /v3/asm/groups": [{ id: 7, name: "Weekly digest" }],
      "GET /v3/asm/groups/7/suppressions": ["u@example.com"],
    });
    const source = createSource(
      { provider: "sendgrid", apiKey: "SG.key", options: {} },
      { ...fast, fetch },
    );
    const all = [];
    let cursor: string | null = null;
    do {
      const result = await source.suppressions(cursor);
      all.push(...result.items);
      cursor = result.next;
    } while (cursor);
    expect(all).toHaveLength(503);
    expect(all[0]).toEqual({
      address: "b0@example.com",
      scope: { kind: "all" },
      reason: "bounce",
      createdAt: new Date(1700000000 * 1000),
    });
    expect(all.at(-2)).toMatchObject({ address: "s@example.com", reason: "complaint" });
    expect(all.at(-1)).toEqual({
      address: "u@example.com",
      scope: { kind: "topic", topicId: "7" },
      reason: "unsubscribe",
      createdAt: null,
    });
  });

  test("a key that can't read unsubscribe groups still imports the other suppressions", async () => {
    const { fetch } = fakeFetch({
      "GET /v3/suppression/bounces?limit=500&offset=0": [{ email: "b@example.com" }],
      "GET /v3/suppression/invalid_emails?limit=500&offset=0": [],
      "GET /v3/suppression/spam_reports?limit=500&offset=0": [],
      "GET /v3/suppression/unsubscribes?limit=500&offset=0": [],
      "GET /v3/asm/groups": new Response("{}", { status: 403 }),
    });
    const source = createSource(
      { provider: "sendgrid", apiKey: "SG.key", options: {} },
      { ...fast, fetch },
    );
    expect(await source.topics()).toEqual([]);
    const all = [];
    let cursor: string | null = null;
    do {
      const result = await source.suppressions(cursor);
      all.push(...result.items);
      cursor = result.next;
    } while (cursor);
    expect(all.map((item) => item.address)).toEqual(["b@example.com"]);
  });

  test("maps event webhook flags and Inbound Parse", async () => {
    const { fetch } = fakeFetch({
      "GET /v3/user/webhooks/event/settings/all": {
        webhooks: [
          {
            id: "wh1",
            url: "https://x.test/sg",
            enabled: true,
            delivered: true,
            bounce: true,
            open: false,
            processed: true,
          },
        ],
      },
      "GET /v3/user/webhooks/parse/settings": {
        result: [{ url: "https://x.test/in", hostname: "in.acme.com" }],
      },
    });
    const source = createSource(
      { provider: "sendgrid", apiKey: "SG.key", options: {} },
      { ...fast, fetch },
    );
    expect(await source.webhooks()).toMatchObject([
      { id: "wh1", eventTypes: ["email.bounced", "email.delivered", "email.sent"] },
      { url: "https://x.test/in", eventTypes: ["email.received"] },
    ]);
  });
});

describe("Postmark", () => {
  const servers = {
    Servers: [
      { ID: 1, Name: "Production", ApiTokens: ["server-token-1"] },
      { ID: 2, Name: "Staging", ApiTokens: ["server-token-2"] },
    ],
  };

  test("an account token with several servers asks which one; a server token works alone", async () => {
    const account = fakeFetch({ "GET /servers?count=500&offset=0": servers });
    expect(
      await checkCredentials("postmark", "acct", {}, { ...fast, fetch: account.fetch }),
    ).toEqual({
      ok: false,
      servers: [
        { id: 1, name: "Production" },
        { id: 2, name: "Staging" },
      ],
    });
    expect(
      await checkCredentials(
        "postmark",
        "acct",
        { serverId: 2 },
        { ...fast, fetch: account.fetch },
      ),
    ).toEqual({
      ok: true,
      options: { tokenType: "account", serverId: 2, serverName: "Staging" },
      account: "Staging",
    });
    const server = fakeFetch({ "GET /server": { ID: 9, Name: "Only" } }, ({ headers }) =>
      headers.get("x-postmark-account-token") ? new Response("{}", { status: 401 }) : undefined,
    );
    expect(
      await checkCredentials("postmark", "srv", {}, { ...fast, fetch: server.fetch }),
    ).toMatchObject({
      ok: true,
      options: { tokenType: "server", serverId: 9 },
    });
  });

  test("reads the chosen server with its own token, maps suppressions per stream", async () => {
    const { fetch, requests } = fakeFetch({
      "GET /servers/2": servers.Servers[1],
      "GET /message-streams?MessageStreamType=All": {
        MessageStreams: [
          { ID: "outbound", Name: "Default", MessageStreamType: "Transactional" },
          { ID: "broadcast", Name: "News", MessageStreamType: "Broadcasts" },
          { ID: "inbound", Name: "Inbound", MessageStreamType: "Inbound" },
        ],
      },
      "GET /message-streams/outbound/suppressions/dump": {
        Suppressions: [
          {
            EmailAddress: "hb@example.com",
            SuppressionReason: "HardBounce",
            Origin: "Recipient",
            CreatedAt: "2025-05-01T00:00:00Z",
          },
          {
            EmailAddress: "m@example.com",
            SuppressionReason: "ManualSuppression",
            Origin: "Customer",
          },
        ],
      },
      "GET /message-streams/broadcast/suppressions/dump": {
        Suppressions: [
          {
            EmailAddress: "u@example.com",
            SuppressionReason: "ManualSuppression",
            Origin: "Recipient",
          },
        ],
      },
    });
    const source = createSource(
      { provider: "postmark", apiKey: "acct", options: { tokenType: "account", serverId: 2 } },
      { ...fast, fetch },
    );
    const first = await source.suppressions(null);
    expect(first.items.map((s) => [s.address, s.scope.kind, s.reason])).toEqual([
      ["hb@example.com", "all", "bounce"],
      ["m@example.com", "all", "manual"],
    ]);
    const second = await source.suppressions(first.next);
    expect(second.items.map((s) => [s.address, s.scope.kind, s.reason])).toEqual([
      ["u@example.com", "marketing", "unsubscribe"],
    ]);
    expect((await source.suppressions(second.next)).next).toBeNull();
    const serverRequests = requests.filter((r) => r.url.includes("/message-streams"));
    expect(
      serverRequests.every((r) => r.headers.get("x-postmark-server-token") === "server-token-2"),
    ).toBe(true);
  });

  test("an account token that may not read domains still reads the server", async () => {
    const { fetch } = fakeFetch({
      "GET /servers/2": servers.Servers[1],
      "GET /domains?count=500&offset=0": Response.json(
        { ErrorCode: 403, Message: "Only the account owner can do that." },
        { status: 403 },
      ),
      "GET /templates?count=100&offset=0&TemplateType=Standard": { Templates: [] },
      "GET /webhooks": { Webhooks: [] },
      "GET /message-streams?MessageStreamType=All": { MessageStreams: [] },
    });
    const source = createSource(
      { provider: "postmark", apiKey: "acct", options: { tokenType: "account", serverId: 2 } },
      { ...fast, fetch },
    );
    const inventory = await source.inventory(Date.now() + 10_000);
    expect(inventory.account).toBe("Staging");
    expect(inventory.unavailable.domains).toContain("owner");
  });

  test("merges a template's layout and converts it", async () => {
    const { fetch } = fakeFetch(
      {
        "GET /server": { ID: 9, Name: "Only" },
        "GET /templates/5": {
          TemplateId: 5,
          Name: "Welcome",
          Alias: "welcome",
          Subject: "Hi {{name}}",
          HtmlBody: "<p>Hi {{name}}</p>",
          TextBody: null,
          LayoutTemplate: "base",
        },
        "GET /templates/base": {
          TemplateId: 6,
          Name: "Base",
          HtmlBody: "<html><body>{{{ @content }}}</body></html>",
          TextBody: null,
        },
      },
      ({ method, url }) =>
        method === "POST" && url.pathname === "/templates/validate"
          ? Response.json({ SuggestedTemplateModel: { name: "name_Value" } })
          : undefined,
    );
    const source = createSource(
      { provider: "postmark", apiKey: "srv", options: { tokenType: "server", serverId: 9 } },
      { ...fast, fetch },
    );
    const template = await source.template("5");
    expect(template.alias).toBe("welcome");
    expect(template.converted.html).toBe("<html><body><p>Hi {{name}}</p></body></html>");
    expect(template.notes).toEqual(["The layout Base was merged into it."]);
  });
});
