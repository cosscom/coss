import { describe, expect, test } from "bun:test";
import { buildTestMessage, receiveFakeEmail } from "@coss/email";
import type {
  InboxMessageObjectOutput,
  InboxObjectOutput,
  InboxThreadObjectOutput,
} from "@coss/email/inbox-schemas";
import type { InboundRuntime } from "@coss/email/runtime";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
} from "./helpers.ts";

async function receive(
  inbound: InboundRuntime,
  to: string,
  overrides: { subject?: string; headers?: Record<string, string> } = {},
) {
  const subject = overrides.subject ?? "Order help";
  const raw = buildTestMessage({
    from: "Jane <jane@example.com>",
    to: [to],
    subject,
    text: "My order arrived damaged.",
    attachments: [
      {
        filename: "photo.jpg",
        contentType: "image/jpeg",
        content: new TextEncoder().encode("jpeg bytes"),
      },
    ],
    ...(overrides.headers ? { headers: overrides.headers } : {}),
  });
  await receiveFakeEmail(
    { raw, mailFrom: "jane@example.com", recipients: [to], subject },
    { store: inbound.store, managedDomain: inbound.managedDomain },
  );
}

describe("inboxes API", () => {
  test("create, receive into a thread, reply, read", async () => {
    const tenant = await createTestTenant();
    const logs = memoryLogWriter();
    const { app, inbound, dispatch } = createTestApp({ logWriter: logs });
    if (!inbound) throw new Error("receiving is on in tests");
    const key = tenant.sandboxKey;

    const created = await apiRequest(app, "POST", "/v1/inboxes", {
      key,
      body: { username: "support-agent", display_name: "Acme Support", client_id: "agent-1" },
    });
    expect(created.status).toBe(201);
    const inbox = (await created.json()) as InboxObjectOutput;
    expect(inbox).toMatchObject({ object: "inbox", kind: "managed", can_send: true });
    const again = await apiRequest(app, "POST", "/v1/inboxes", {
      key,
      body: { client_id: "agent-1" },
    });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(inbox);
    const taken = await apiRequest(app, "POST", "/v1/inboxes", {
      key,
      body: { username: "support-agent" },
    });
    expect(taken.status).toBe(422);
    expect(await errorOf(taken)).toMatchObject({ code: "address_taken", param: "username" });
    const invalid = await apiRequest(app, "POST", "/v1/inboxes", {
      key,
      body: { username: "Not Valid" },
    });
    expect((await errorOf(invalid)).code).toBe("validation_error");

    await receive(inbound, inbox.address);
    const threads = await apiRequest(app, "GET", `/v1/inboxes/${inbox.id}/threads`, { key });
    const list = (await threads.json()) as { data: { id: string; message_count: number }[] };
    expect(list.data).toHaveLength(1);
    const threadId = list.data[0]?.id ?? "";
    const threadRes = await apiRequest(app, "GET", `/v1/inboxes/${inbox.id}/threads/${threadId}`, {
      key,
    });
    const thread = (await threadRes.json()) as InboxThreadObjectOutput;
    const [received] = thread.messages;
    expect(received).toMatchObject({
      direction: "inbound",
      text: "My order arrived damaged.",
      attachments: [{ filename: "photo.jpg", content_type: "image/jpeg" }],
    });

    const attachment = await apiRequest(
      app,
      "GET",
      `/v1/inboxes/${inbox.id}/messages/${received?.id}/attachments/${received?.attachments[0]?.id}`,
      { key },
    );
    expect(attachment.status).toBe(200);
    expect(attachment.headers.get("content-type")).toBe("application/octet-stream");
    expect(await attachment.text()).toBe("jpeg bytes");

    const replyPath = `/v1/inboxes/${inbox.id}/messages/${received?.id}/reply`;
    const replied = await apiRequest(app, "POST", replyPath, {
      key,
      body: { text: "Sorry! A new one is on its way." },
      headers: { "Idempotency-Key": "reply-1" },
    });
    expect(replied.status).toBe(202);
    const reply = (await replied.json()) as InboxMessageObjectOutput;
    expect(reply).toMatchObject({
      direction: "outbound",
      status: "queued",
      thread_id: threadId,
      from: `"Acme Support" <${inbox.address}>`,
      to: ["Jane <jane@example.com>"],
      subject: "Re: Order help",
    });
    const replay = await apiRequest(app, "POST", replyPath, {
      key,
      body: { text: "Sorry! A new one is on its way." },
      headers: { "Idempotency-Key": "reply-1" },
    });
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(((await replay.json()) as InboxMessageObjectOutput).id).toBe(reply.id);
    await dispatch();
    const sent = await apiRequest(app, "GET", `/v1/inboxes/${inbox.id}/messages/${reply.id}`, {
      key,
    });
    expect(((await sent.json()) as InboxMessageObjectOutput).status).toBe("sent");

    const messages = await apiRequest(
      app,
      "GET",
      `/v1/inboxes/${inbox.id}/messages?direction=outbound`,
      { key },
    );
    expect(((await messages.json()) as { data: { id: string }[] }).data.map((m) => m.id)).toEqual([
      reply.id,
    ]);

    const started = await apiRequest(app, "POST", `/v1/inboxes/${inbox.id}/messages`, {
      key,
      body: { to: "bob@example.com", subject: "Hello Bob", text: "Hi!" },
    });
    expect(started.status).toBe(202);
    expect(((await started.json()) as InboxMessageObjectOutput).thread_id).not.toBe(threadId);

    // Inbox responses carry received mail: never copied into the environment's log.
    const logged = JSON.stringify(logs.entries);
    expect(logs.entries.length).toBeGreaterThan(0);
    expect(logged).not.toContain("My order arrived damaged.");

    const deleted = await apiRequest(app, "DELETE", `/v1/inboxes/${inbox.id}`, { key });
    expect(await deleted.json()).toEqual({ object: "inbox", id: inbox.id, deleted: true });
    const gone = await apiRequest(app, "GET", `/v1/inboxes/${inbox.id}/threads`, { key });
    expect(gone.status).toBe(404);
  });

  test("live managed inboxes only receive; keys need inbox permissions", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await apiRequest(app, "POST", "/v1/inboxes", {
      key: tenant.liveKey,
      body: {},
    });
    const inbox = (await created.json()) as InboxObjectOutput;
    expect(inbox).toMatchObject({ can_send: false, sandbox: false });
    const refused = await apiRequest(app, "POST", `/v1/inboxes/${inbox.id}/messages`, {
      key: tenant.liveKey,
      body: { to: "bob@example.com", subject: "Hi", text: "Hi" },
    });
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).code).toBe("inbox_cannot_send");

    const other = await createTestTenant();
    const foreign = await apiRequest(app, "GET", `/v1/inboxes/${inbox.id}`, {
      key: other.liveKey,
    });
    expect(foreign.status).toBe(404);

    const keyId = await apiKeyIdForEnvironment(tenant.production.id);
    await setKeyPermissions(keyId, { email: ["send", "read"] });
    const forbidden = await apiRequest(app, "GET", "/v1/inboxes", { key: tenant.liveKey });
    expect(forbidden.status).toBe(403);
    await setKeyPermissions(keyId, { inbox: ["read"] });
    const read = await apiRequest(app, "GET", "/v1/inboxes", { key: tenant.liveKey });
    expect(read.status).toBe(200);
    const write = await apiRequest(app, "PATCH", `/v1/inboxes/${inbox.id}`, {
      key: tenant.liveKey,
      body: { display_name: "Bot" },
    });
    expect(write.status).toBe(403);
  });
});
