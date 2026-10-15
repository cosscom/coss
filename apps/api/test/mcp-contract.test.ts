/**
 * Contract test: the published `coss-mcp` server (built dist, on the built `coss` SDK) against the
 * real app, in process. What a coding agent asks — "did my email get delivered?" — end to end.
 */
import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { Coss } from "coss";
import { createCossMcpServer } from "coss-mcp";
import { createTestApp, type TestApp } from "./helpers.ts";

async function connect(app: TestApp, apiKey: string) {
  const coss = new Coss({
    apiKey,
    baseUrl: "http://api.test",
    fetch: (input, init) =>
      Promise.resolve(
        app.fetch(
          input instanceof Request ? new Request(input, init) : new Request(String(input), init),
        ),
      ),
  });
  const server = createCossMcpServer({ coss, apiKey });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "contract-test", version: "0.0.0" });
  await client.connect(clientTransport);
  return async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const [content] = result.content as { type: string; text: string }[];
    // biome-ignore lint/suspicious/noExplicitAny: assertions read the tool's JSON.
    return { isError: result.isError === true, data: JSON.parse(content?.text ?? "null") as any };
  };
}

describe("coss-mcp against the API", () => {
  test("send, find and diagnose: delivered, bounced and suppressed recipients", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const call = await connect(app, tenant.sandboxKey);

    const sent = await call("send_email", {
      from: "Acme <hello@acme.com>",
      to: ["ada@example.com", "bounce@simulator.amazonses.com"],
      subject: "Welcome to Acme",
      text: "Hi",
    });
    expect(sent.isError).toBe(false);
    expect(sent.data.email.status).toBe("queued");
    await dispatch();

    const found = await call("find_emails", { to: "ada@example.com" });
    expect(found.data.emails).toEqual([
      expect.objectContaining({
        id: sent.data.email.id,
        status: "sent",
        recipients: [
          { address: "ada@example.com", status: "delivered" },
          { address: "bounce@simulator.amazonses.com", status: "bounced" },
        ],
      }),
    ]);

    const diagnosis = await call("diagnose_email", { to: "ada@example.com", query: "welcome" });
    expect(diagnosis.isError).toBe(false);
    expect(diagnosis.data).toMatchObject({
      email_id: sent.data.email.id,
      sandbox: true,
      verdict: "partially_delivered",
      recipients: [
        { address: "ada@example.com", outcome: "delivered" },
        { address: "bounce@simulator.amazonses.com", outcome: "bounced" },
      ],
    });
    expect(diagnosis.data.warnings[0]).toStartWith("Sandbox email");

    await call("add_suppression", { address: "gone@example.com" });
    const skipped = await call("send_email", {
      from: "hello@acme.com",
      to: "gone@example.com",
      subject: "Hello again",
      text: "Hi",
    });
    await dispatch();
    const suppressed = await call("diagnose_email", { email_id: skipped.data.email.id });
    expect(suppressed.data).toMatchObject({
      verdict: "not_delivered",
      failure: { code: "all_recipients_suppressed" },
      recipients: [
        {
          address: "gone@example.com",
          outcome: "suppressed",
          details: { suppressions: [{ reason: "manual", scope: "*" }] },
        },
      ],
    });

    const removed = await call("remove_suppression", { address: "gone@example.com" });
    expect(removed.data.removed).toHaveLength(1);
    expect((await call("check_suppression", { address: "gone@example.com" })).data.suppressed).toBe(
      false,
    );
  });

  test("emails of another environment are not found, with a hint", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const sandbox = await connect(app, tenant.sandboxKey);
    const live = await connect(app, tenant.liveKey);
    const sent = await sandbox("send_email", {
      from: "hello@acme.com",
      to: "ada@example.com",
      subject: "Hi",
      text: "Hi",
    });
    const lookup = await live("get_email", { id: sent.data.email.id });
    expect(lookup.isError).toBe(true);
    expect(lookup.data.error.type).toBe("not_found_error");
    expect(lookup.data.hint).toContain("environment");
    expect((await live("diagnose_email", { to: "ada@example.com" })).isError).toBe(true);
  });
});
