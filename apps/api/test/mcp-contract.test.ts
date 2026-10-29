/**
 * Contract test: the published `coss-mcp` server (built dist, on the built `coss` SDK) against the
 * real app, in process. What a coding agent asks — "did my email get delivered?" — end to end.
 */
import { describe, expect, test } from "bun:test";
import { buildTestMessage, receiveFakeEmail } from "@coss/email";
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

  test("send_sms, then get, find and diagnose it; a filtered message and the simulated reply", async () => {
    const tenant = await createTestTenant();
    const { app, dispatchSms } = createTestApp();
    const call = await connect(app, tenant.sandboxKey);

    const sent = await call("send_sms", {
      from: "+14155550123",
      to: "+15005550006",
      body: "Your Acme code is 482913",
    });
    expect(sent.isError).toBe(false);
    expect(sent.data.sms.status).toBe("queued");
    await dispatchSms();

    const got = await call("get_sms", { id: sent.data.sms.id });
    expect(got.data.sms).toMatchObject({ status: "delivered", sandbox: true });
    expect(got.data.events.map((e: { type: string }) => e.type)).toEqual([
      "sms.sent",
      "sms.delivered",
    ]);

    const filtered = await call("send_sms", {
      from: "+14155550123",
      to: "+15005550004",
      body: "Hi",
    });
    const reply = await call("send_sms", { from: "+14155550123", to: "+15005550008", body: "Hi" });
    await dispatchSms();
    const found = await call("find_sms", { status: ["undelivered"] });
    expect(found.data.sms).toEqual([
      expect.objectContaining({ id: filtered.data.sms.id, failure: expect.anything() }),
    ]);
    const diagnosis = await call("diagnose_sms", { to: "+15005550004" });
    expect(diagnosis.data).toMatchObject({
      sms_id: filtered.data.sms.id,
      verdict: "not_delivered",
      failure: { code: "carrier_filtered" },
      details: { provider_error_code: "30007" },
    });
    expect(diagnosis.data.warnings[0]).toStartWith("Sandbox message");

    const received = await call("list_received_sms", { to: "+14155550123" });
    expect(received.data.received_sms).toEqual([
      expect.objectContaining({ from: reply.data.sms.to, to: "+14155550123" }),
    ]);

    await call("add_sms_suppression", { phone_number: "+14155550199" });
    expect(
      (await call("check_sms_suppression", { phone_number: "+14155550199" })).data.suppressed,
    ).toBe(true);
    const skipped = await call("send_sms", {
      from: "+14155550123",
      to: "+14155550199",
      body: "Hi",
    });
    const suppressed = await call("diagnose_sms", { sms_id: skipped.data.sms.id });
    expect(suppressed.data).toMatchObject({
      verdict: "not_delivered",
      failure: { code: "suppressed" },
      details: { suppression: { reason: "manual" } },
    });
    const removed = await call("remove_sms_suppression", { phone_number: "+14155550199" });
    expect(removed.data.removed).toHaveLength(1);
    expect((await call("list_sms_numbers")).data.numbers).toEqual([]);
  });

  test("an agent's inbox: create it, read the thread mail started, reply in it", async () => {
    const tenant = await createTestTenant();
    const { app, inbound } = createTestApp();
    if (!inbound) throw new Error("receiving is on in tests");
    const call = await connect(app, tenant.sandboxKey);

    const created = await call("create_inbox", { username: "helper", client_id: "agent-7" });
    expect(created.isError).toBe(false);
    const { id, address } = created.data.inbox;
    const raw = buildTestMessage({
      from: "Ada <ada@example.com>",
      to: [address],
      subject: "Question",
      text: "Is the API up?",
    });
    await receiveFakeEmail(
      { raw, mailFrom: "ada@example.com", recipients: [address], subject: "Question" },
      { store: inbound.store, managedDomain: inbound.managedDomain },
    );

    const threads = await call("list_inbox_threads", { inbox_id: id });
    expect(threads.data.threads).toEqual([
      expect.objectContaining({ subject: "Question", awaiting_reply: true }),
    ]);
    const thread = await call("get_inbox_thread", {
      inbox_id: id,
      thread_id: threads.data.threads[0].id,
    });
    const [question] = thread.data.thread.messages;
    expect(question).toMatchObject({ direction: "inbound", text: "Is the API up?" });

    const reply = await call("reply_to_inbox_message", {
      inbox_id: id,
      message_id: question.id,
      text: "Yes, all green.",
      idempotency_key: `reply-${question.id}`,
    });
    expect(reply.isError).toBe(false);
    expect(reply.data.message).toMatchObject({ direction: "outbound", subject: "Re: Question" });
    const after = await call("list_inbox_threads", { inbox_id: id });
    expect(after.data.threads[0]).toMatchObject({ messages: 2 });
    expect(after.data.threads[0]).not.toHaveProperty("awaiting_reply", true);
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
