/**
 * Contract test: the published `coss-cli` (built dist, on the built `coss` SDK) against the real
 * app, in process: sign in with a key, send a simulated bounce and wait for it, and forward the
 * environment's webhook events to a local receiver with `coss listen`.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
