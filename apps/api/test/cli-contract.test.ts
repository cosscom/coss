/**
 * Contract test: the published `coss-cli` (built dist, on the built `coss` SDK) against the real
 * app, in process: sign in with a key, send a simulated bounce and wait for it, and forward the
 * environment's webhook events to a local receiver with `coss listen`.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDueHookDeliveries } from "@coss/hooks";
import { testHookDeliveryDeps } from "@coss/hooks/testing";
import { buildTestMessage, receiveFakeEmail } from "@coss/email";
import { queryLogs } from "@coss/logs";
import { createTestTenant } from "@coss/tenancy/testing";
import { webhookReceiver } from "@coss/webhooks/testing";
import { verifyWebhook } from "coss";
import { type CliIo, run } from "coss-cli";
import { createTestApp, type TestApp } from "./helpers.ts";

function toRequest(input: string | URL | Request, init?: RequestInit): Request {
  return input instanceof Request ? new Request(input, init) : new Request(String(input), init);
}

/** The CLI's io: the API is the in-process app, local URLs are real, output goes to strings. */
function cliIo(
  app: TestApp,
  opts: { answers?: string[]; stdin?: string; sleep?: () => Promise<void> } = {},
) {
  let stdout = "";
  let stderr = "";
  const controller = new AbortController();
  const answers = [...(opts.answers ?? [])];
  const io: CliIo = {
    env: { COSS_BASE_URL: "http://api.test" },
    stdout: {
      write: (chunk) => {
        stdout += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
      },
    },
    stderr: {
      write: (text) => {
        stderr += text;
      },
    },
    stdinIsTTY: false,
    fetch: async (input, init) =>
      String(input instanceof Request ? input.url : input).startsWith("http://api.test")
        ? app.fetch(toRequest(input, init))
        : fetch(input, init),
    now: () => new Date(),
    sleep: async (ms, signal) => {
      if (opts.sleep) return opts.sleep();
      await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 20)));
      void signal;
    },
    openBrowser: async () => false,
    readStdin: async () => opts.stdin ?? "",
    prompt: async () => answers.shift() ?? "",
    hostname: () => "contract-test",
    configDir: mkdtempSync(join(tmpdir(), "coss-cli-contract-")),
    signal: controller.signal,
  };
  return { io, controller, stdout: () => stdout, stderr: () => stderr };
}

describe("coss-cli against the API", () => {
  test("login --manual, whoami, and a simulated bounce followed to its outcome", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const cli = cliIo(app, { answers: [tenant.sandboxKey], sleep: () => dispatch() });

    expect(await run(["login", "--manual"], cli.io)).toBe(0);
    expect(cli.stdout()).toContain(`Signed in to ${tenant.organization.name} / Test Project / `);
    const config = JSON.parse(readFileSync(join(cli.io.configDir, "config.json"), "utf8"));
    expect(config.profiles.default).toMatchObject({
      api_key: tenant.sandboxKey,
      base_url: "http://api.test",
      environment: { id: tenant.development.id, mode: "sandbox" },
    });

    expect(await run(["whoami", "--json"], cli.io)).toBe(0);
    const whoami = JSON.parse(cli.stdout().trim().split("\n").at(-1) ?? "{}");
    expect(whoami.environment).toMatchObject({ id: tenant.development.id, mode: "sandbox" });

    expect(await run(["emails", "send", "--simulate", "bounced", "--wait", "--json"], cli.io)).toBe(
      0,
    );
    const sent = JSON.parse(cli.stdout().trim().split("\n").at(-1) ?? "{}");
    expect(sent).toMatchObject({
      status: "sent",
      recipients: [{ address: "bounce@simulator.amazonses.com", status: "bounced" }],
    });
    expect(sent.events.map((event: { type: string }) => event.type)).toEqual(
      expect.arrayContaining(["email.sent", "email.bounced"]),
    );
  });

  test("api: any endpoint with the profile's key, a body from stdin, and every page of a list", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const body = { from: "hello@acme.com", to: "ada@example.com", subject: "Hi", text: "Hi" };
    const cli = cliIo(app, { answers: [tenant.sandboxKey], stdin: JSON.stringify(body) });
    expect(await run(["login", "--manual"], cli.io)).toBe(0);
    const lines = () => cli.stdout().trim().split("\n");

    expect(await run(["api", "environment", "--json"], cli.io)).toBe(0);
    expect(JSON.parse(lines().at(-1) ?? "{}")).toMatchObject({ id: tenant.development.id });

    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      expect(await run(["api", "emails", "--input", "-", "--json"], cli.io)).toBe(0);
      ids.push(JSON.parse(lines().at(-1) ?? "{}").id);
    }
    const before = lines().length;
    expect(await run(["api", "emails", "--paginate", "-F", "limit=2"], cli.io)).toBe(0);
    expect(
      lines()
        .slice(before)
        .map((line) => JSON.parse(line).id),
    ).toEqual(ids.toReversed());

    expect(await run(["api", "emails/email_nope", "--json"], cli.io)).toBe(1);
    expect(JSON.parse(lines().at(-1) ?? "{}").error).toMatchObject({ status: 404 });
  });

  test("hooks: an application with an endpoint, a message delivered to it, and its portal", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const receiver = webhookReceiver();
    const cli = cliIo(app, { answers: [tenant.sandboxKey] });
    const last = () => JSON.parse(cli.stdout().trim().split("\n").at(-1) ?? "{}");
    try {
      expect(await run(["login", "--manual"], cli.io)).toBe(0);
      const example = JSON.stringify({ invoice_id: "in_1", amount: 4200 });
      expect(
        await run(["hooks", "event-types", "create", "invoice.paid", "--example", example], cli.io),
      ).toBe(0);
      expect(
        await run(["hooks", "apps", "create", "Acme", "--uid", "acme", "--json"], cli.io),
      ).toBe(0);
      expect(last()).toMatchObject({ object: "hook_application", uid: "acme" });
      expect(
        await run(
          [
            "hooks",
            "endpoints",
            "add",
            "acme",
            "--url",
            receiver.url,
            "--types",
            "invoice.paid",
            "--json",
          ],
          cli.io,
        ),
      ).toBe(0);
      const endpoint = last();
      expect(endpoint.secret).toStartWith("whsec_");

      // No payload: the event type's example is sent.
      expect(await run(["hooks", "send", "acme", "invoice.paid", "--json"], cli.io)).toBe(0);
      const message = last();
      expect(message.payload).toEqual({ invoice_id: "in_1", amount: 4200 });
      expect(
        await runDueHookDeliveries(
          { scope: { organizationIds: [tenant.organization.id] } },
          testHookDeliveryDeps(),
        ),
      ).toBe(1);
      const [request] = receiver.received;
      if (!request) throw new Error("nothing received");
      const headers = Object.fromEntries(request.headers.entries());
      expect(
        await verifyWebhook<Record<string, unknown>>(request.body, headers, endpoint.secret),
      ).toEqual({
        invoice_id: "in_1",
        amount: 4200,
      });

      expect(await run(["hooks", "deliveries", "acme", "--json"], cli.io)).toBe(0);
      const delivery = last();
      expect(delivery).toMatchObject({ status: "succeeded", message_id: message.id });
      expect(await run(["hooks", "attempts", "acme", delivery.id, "--json"], cli.io)).toBe(0);
      expect(last()).toMatchObject({ object: "hook_attempt", status_code: 200 });
      expect(await run(["hooks", "retry", "acme", delivery.id, "--json"], cli.io)).toBe(0);
      expect(last()).toMatchObject({ id: delivery.id, status: "pending" });
      expect(await run(["hooks", "endpoints", "list", "acme", "--json"], cli.io)).toBe(0);
      expect(last()).toMatchObject({ id: endpoint.id, url: receiver.url });
      expect(await run(["hooks", "portal", "acme", "--read-only"], cli.io)).toBe(0);
      expect(cli.stdout().trim().split("\n").at(-1)).toContain("#cossp_");
    } finally {
      receiver.stop();
    }
  });

  test("risk: list entries decide, sandbox fixtures score, and feedback resolves", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const cli = cliIo(app, { answers: [tenant.sandboxKey] });
    const last = () => JSON.parse(cli.stdout().trim().split("\n").at(-1) ?? "{}");
    expect(await run(["login", "--manual"], cli.io)).toBe(0);

    expect(
      await run(
        ["risk", "lists", "add", "block", "domain", "evil.test", "--note", "spam", "--json"],
        cli.io,
      ),
    ).toBe(0);
    const entry = last();
    expect(entry).toMatchObject({ list: "block", type: "domain", value: "evil.test" });

    expect(
      await run(
        ["risk", "assess", "--event", "signup", "--email", "ada@evil.test", "--json"],
        cli.io,
      ),
    ).toBe(0);
    const blocked = last();
    expect(blocked.decision).toBe("block");
    expect(blocked.reasons.map((reason: { code: string }) => reason.code)).toContain(
      "list.blocked",
    );

    expect(
      await run(
        [
          "risk",
          "assess",
          "--event",
          "signup",
          "--email",
          "ada@disposable.test",
          "--ip",
          "192.0.2.1",
        ],
        cli.io,
      ),
    ).toBe(0);
    expect(cli.stdout()).toContain("email.disposable");
    expect(cli.stdout()).toContain("ip.tor");

    expect(
      await run(["risk", "feedback", blocked.id, "--outcome", "fraud", "--json"], cli.io),
    ).toBe(0);
    expect(last()).toMatchObject({ id: blocked.id, outcome: "fraud" });
    expect(await run(["risk", "assessments", "--decision", "block", "--json"], cli.io)).toBe(0);
    expect(cli.stdout()).toContain(blocked.id);

    expect(await run(["risk", "lists", "remove", entry.id, "--json"], cli.io)).toBe(0);
    expect(last()).toMatchObject({ id: entry.id, deleted: true });
    const before = cli.stdout().length;
    expect(await run(["risk", "lists", "list", "--json"], cli.io)).toBe(0);
    expect(cli.stdout().slice(before)).toBe("");
  });

  test("emails list, events and diagnose explain a bounce; inbox shows and follows received mail", async () => {
    const tenant = await createTestTenant();
    const testApp = createTestApp();
    const { app, dispatch, inbound } = testApp;
    if (!inbound) throw new Error("no inbound runtime");
    let onSleep: () => Promise<void> = () => dispatch();
    const cli = cliIo(app, { answers: [tenant.sandboxKey], sleep: () => onSleep() });
    const lines = () => cli.stdout().trim().split("\n");
    expect(await run(["login", "--manual"], cli.io)).toBe(0);

    expect(await run(["emails", "send", "--simulate", "bounced", "--wait", "--json"], cli.io)).toBe(
      0,
    );
    const sent = JSON.parse(lines().at(-1) ?? "{}");
    let before = lines().length;
    expect(await run(["emails", "list", "--recipient-status", "bounced", "--json"], cli.io)).toBe(
      0,
    );
    expect(
      lines()
        .slice(before)
        .map((line) => JSON.parse(line).id),
    ).toContain(sent.id);

    before = lines().length;
    expect(await run(["emails", "events", sent.id, "--json"], cli.io)).toBe(0);
    expect(
      lines()
        .slice(before)
        .map((line) => JSON.parse(line).type),
    ).toContain("email.bounced");

    expect(await run(["emails", "diagnose", sent.id, "--json"], cli.io)).toBe(0);
    expect(JSON.parse(lines().at(-1) ?? "{}")).toMatchObject({
      email_id: sent.id,
      verdict: "not_delivered",
      sandbox: true,
      recipients: [{ address: "bounce@simulator.amazonses.com", outcome: "bounced" }],
    });
    expect(await run(["emails", "diagnose", sent.id], cli.io)).toBe(0);
    expect(cli.stdout()).toContain("bounce@simulator.amazonses.com  bounced");

    // Received mail: one already there, one that arrives while `coss inbox` runs.
    const address = await app.request("/v1/received_emails/address", {
      headers: { Authorization: `Bearer ${tenant.sandboxKey}` },
    });
    const { domain } = (await address.json()) as { domain: string };
    const receive = async (subject: string) => {
      const raw = buildTestMessage({
        from: "Jane <jane@example.com>",
        to: [`support@${domain}`],
        subject,
        text: `Body of ${subject}`,
        html: "<p>HTML</p>",
        attachments: [],
      });
      const [outcome] = await receiveFakeEmail(
        { raw, mailFrom: "jane@example.com", recipients: [`support@${domain}`], subject },
        { store: inbound.store, managedDomain: inbound.managedDomain },
      );
      if (outcome?.kind !== "received") throw new Error(`not received: ${outcome?.kind}`);
      return outcome.receivedEmailId;
    };
    const earlier = await receive("Earlier");
    expect(await run(["inbox", "get", earlier], cli.io)).toBe(0);
    expect(cli.stdout()).toContain("Subject    Earlier");
    expect(cli.stdout()).toContain("Body of Earlier");

    let later = "";
    onSleep = async () => {
      if (!later) later = await receive("Later");
      else cli.controller.abort();
    };
    before = lines().length;
    expect(await run(["inbox", "--json"], cli.io)).toBe(130);
    const objects = lines()
      .slice(before)
      .map((line) => JSON.parse(line));
    expect(objects[0]).toMatchObject({ object: "inbound_address", domain });
    expect(objects.slice(1).map((object) => object.id)).toEqual([later]);
  });

  test("listen forwards the environment's events to a local server, signed, and logs them", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const receiver = webhookReceiver();
    const cli = cliIo(app, { answers: [tenant.sandboxKey] });
    try {
      expect(await run(["login", "--manual"], cli.io)).toBe(0);
      const started = new Date();
      const listening = run(
        ["listen", "--forward-to", receiver.url, "--events", "email.sent,email.delivered"],
        cli.io,
      );
      // Once the listener is open, send an email; its events reach the receiver.
      for (let i = 0; i < 200 && !cli.stderr().includes("Ready!"); i++) await Bun.sleep(10);
      const sent = await app.request("/v1/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenant.sandboxKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "hello@acme.com",
          to: "ada@example.com",
          subject: "Hi",
          text: "Hi",
        }),
      });
      expect(sent.status).toBe(202);
      await dispatch();
      // Until the CLI has both answers: Ctrl-C mid-forward reports that forward as interrupted.
      const forwarded = () => cli.stdout().split("[200]").length - 1;
      for (let i = 0; i < 300 && forwarded() < 2; i++) await Bun.sleep(10);
      cli.controller.abort();
      expect(await listening).toBe(130);

      expect(receiver.received.map((r) => JSON.parse(r.body).type)).toEqual([
        "email.sent",
        "email.delivered",
      ]);
      const config = JSON.parse(readFileSync(join(cli.io.configDir, "config.json"), "utf8"));
      const secret: string = config.profiles.default.listen_secret;
      expect(cli.stderr()).toContain(secret);
      for (const request of receiver.received) {
        const event = await verifyWebhook(request.body, request.headers, secret);
        expect(request.headers.get("webhook-id")).toBe(event.id);
      }

      // Each forward is a webhook.forward log line; the listener is closed.
      const logs = await queryLogs({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        from: new Date(started.getTime() - 60_000),
        to: new Date(Date.now() + 60_000),
        filters: { sources: ["webhook"] },
      });
      expect(logs.data.map((line) => line.type)).toEqual(["webhook.forward", "webhook.forward"]);
      expect(logs.data[0]?.status_code).toBe(200);
      const listenerId = String(logs.data[0]?.attributes.listener_id);
      const closed = await app.request(`/v1/webhook_listeners/${listenerId}/poll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenant.sandboxKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wait_ms: 0 }),
      });
      expect(closed.status).toBe(404);
    } finally {
      receiver.stop();
    }
  });
});
