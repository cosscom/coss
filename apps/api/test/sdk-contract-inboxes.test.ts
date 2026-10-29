/** Contract test: the built SDK's `coss.inboxes` against the real app, in process. */
import { expect, test } from "bun:test";
import { buildTestMessage, receiveFakeEmail } from "@coss/email";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss } from "coss";
import { createTestApp, type TestApp } from "./helpers.ts";

function clientFor(app: TestApp, apiKey: string): Coss {
  return new Coss({
    apiKey,
    baseUrl: "http://api.test",
    fetch: (input, init) =>
      Promise.resolve(
        app.fetch(
          input instanceof Request ? new Request(input, init) : new Request(String(input), init),
        ),
      ),
  });
}

test("coss.inboxes creates inboxes, reads threads and replies", async () => {
  const tenant = await createTestTenant();
  const { app, inbound } = createTestApp();
  if (!inbound) throw new Error("receiving is on in tests");
  const coss = clientFor(app, tenant.sandboxKey);

  const created = await coss.inboxes.create({ username: "agent", client_id: "agent-1" });
  expect(created.error).toBeNull();
  const inbox = created.data;
  if (!inbox) throw new Error("no inbox");
  expect((await coss.inboxes.create({ client_id: "agent-1" })).data?.id).toBe(inbox.id);
  expect((await coss.inboxes.list()).data?.data.map((item) => item.id)).toEqual([inbox.id]);
  expect((await coss.inboxes.update(inbox.id, { display_name: "Agent" })).data?.display_name).toBe(
    "Agent",
  );

  const raw = buildTestMessage({
    from: "Jane <jane@example.com>",
    to: [inbox.address],
    subject: "Help",
    text: "Can you help?",
  });
  await receiveFakeEmail(
    { raw, mailFrom: "jane@example.com", recipients: [inbox.address], subject: "Help" },
    { store: inbound.store, managedDomain: inbound.managedDomain },
  );
  const threads = await coss.inboxes.threads.list(inbox.id);
  const threadId = threads.data?.data[0]?.id ?? "";
  const thread = await coss.inboxes.threads.get(inbox.id, threadId);
  expect(thread.data?.messages.map((message) => message.extracted_text)).toEqual(["Can you help?"]);

  const reply = await coss.inboxes.messages.reply(inbox.id, thread.data?.messages[0]?.id ?? "", {
    text: "Of course.",
  });
  expect(reply.error).toBeNull();
  expect(reply.data).toMatchObject({ thread_id: threadId, subject: "Re: Help" });
  const sent = await coss.inboxes.messages.send(inbox.id, {
    to: "bob@example.com",
    subject: "Hello",
    text: "Hi Bob",
  });
  expect(sent.data?.direction).toBe("outbound");
  const outbound = await coss.inboxes.messages.list(inbox.id, { direction: "outbound" });
  expect(outbound.data?.data).toHaveLength(2);
  expect((await coss.inboxes.messages.get(inbox.id, sent.data?.id ?? "")).data?.text).toBe(
    "Hi Bob",
  );
  expect((await coss.inboxes.threads.delete(inbox.id, threadId)).data?.deleted).toBe(true);
  expect((await coss.inboxes.delete(inbox.id)).data?.deleted).toBe(true);
  expect((await coss.inboxes.get(inbox.id)).error?.status).toBe(404);
});
