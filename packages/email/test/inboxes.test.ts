import { describe, expect, test } from "bun:test";
import { BillingError, createPlanGate, createUsageGate, periodOf } from "@coss/billing";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, renderWebhookPayload } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq, sum } from "drizzle-orm";
import { InboxError } from "../src/errors.ts";
import { receiveFakeEmail } from "../src/inbound.ts";
import { buildTestMessage } from "../src/inbound-mime.ts";
import { FakeInboundStore } from "../src/inbound-store.ts";
import {
  CreateInboxRequest,
  InboxMessageReceivedWebhookEvent,
  InboxObject,
} from "../src/inbox-schemas.ts";
import { replyReferences, replyToInboxMessage, sendInboxMessage } from "../src/inbox-send.ts";
import { extractReplyText, normalizeSubject, replySubject } from "../src/inbox-text.ts";
import {
  chargeDueInboxFees,
  createInbox,
  deleteInbox,
  deleteInboxThread,
  getInboxMessage,
  getInboxThread,
  type InboxEnvironment,
  listInboxes,
  listInboxMessages,
  listInboxThreads,
  purgeEmptyInboxThreads,
  updateInbox,
} from "../src/inboxes.ts";
import { DEVELOPMENT_LINK_KEYS } from "../src/link-tokens.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { deleteReceivedEmail } from "../src/received-emails.ts";
import { createReceivingDomain, deleteReceivingDomain } from "../src/receiving-domains.ts";
import { EmailSubject } from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import { updateStorageSettings } from "../src/storage-settings.ts";
import {
  createVerifiedDomain,
  dispatchingEmailService,
  memoryDispatchQueue,
} from "../src/testing.ts";

const MANAGED = "inbound.coss.test";
const store = new FakeInboundStore();
const deps = { store, managedDomain: MANAGED };
const service = dispatchingEmailService({
  liveProvider: new FakeEmailProvider({ log: false }),
  sandboxProvider: new FakeEmailProvider({ log: false }),
});

function sandbox(tenant: TestTenant): InboxEnvironment {
  return {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox",
  };
}

function live(tenant: TestTenant): InboxEnvironment {
  return {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    mode: "live",
  };
}

async function inboxDays(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ total: sum(schema.billingUsage.quantity) })
    .from(schema.billingUsage)
    .where(
      and(
        eq(schema.billingUsage.organizationId, organizationId),
        eq(schema.billingUsage.meter, "email.inboxes"),
      ),
    );
  return Number(row?.total ?? 0);
}

async function billingRefusal(promise: Promise<unknown>): Promise<BillingError> {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  if (!(error instanceof BillingError)) throw new Error(`expected a BillingError, got ${error}`);
  return error;
}

async function refusal(promise: Promise<unknown>): Promise<InboxError> {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  if (!(error instanceof InboxError)) throw new Error(`expected an InboxError, got ${error}`);
  return error;
}

async function receive(input: {
  to: string[];
  recipients?: string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  headers?: Record<string, string>;
  receivedAt?: Date;
}) {
  const raw = buildTestMessage({
    from: input.from ?? "Jane <jane@example.com>",
    to: input.to,
    subject: input.subject,
    ...(input.text !== undefined ? { text: input.text } : {}),
    ...(input.html !== undefined ? { html: input.html } : {}),
    ...(input.messageId ? { messageId: input.messageId } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
  });
  return receiveFakeEmail(
    {
      raw,
      mailFrom: "jane@example.com",
      recipients: input.recipients ?? input.to,
      subject: input.subject,
      ...(input.receivedAt ? { receivedAt: input.receivedAt } : {}),
    },
    deps,
  );
}

describe("inbox text", () => {
  test("subjects are matched without reply prefixes", () => {
    expect(normalizeSubject("Re: RE: Fwd:  Your   Order")).toBe("your order");
    expect(normalizeSubject("AW: Re[2]: Hello")).toBe("hello");
    expect(normalizeSubject(null)).toBe("");
    expect(replySubject("Your order")).toBe("Re: Your order");
    expect(replySubject("RE: Your order")).toBe("RE: Your order");
    expect(replySubject(null)).toBe("Re:");
    // What a send refuses is left out, and the subject fits the send limit.
    expect(replySubject("Hi\u0007 there\u200b")).toBe("Re: Hi  there");
    const long = replySubject(`${"x".repeat(996)}😀`);
    expect(long.length).toBeLessThanOrEqual(998);
    expect(long.startsWith("Re: xxx")).toBe(true);
    expect(EmailSubject.safeParse(replySubject("y".repeat(998))).success).toBe(true);
    expect(CreateInboxRequest.safeParse({ username: "agent..one" }).success).toBe(false);
    expect(CreateInboxRequest.safeParse({ username: "agent.one" }).success).toBe(true);
  });

  test("extracted text leaves out the quoted conversation and the signature", () => {
    expect(
      extractReplyText(
        "Thanks, that works!\n\nOn Mon, Oct 10, 2026 at 12:00 PM Acme <help@acme.com> wrote:\n> Here you go",
      ),
    ).toBe("Thanks, that works!");
    expect(
      extractReplyText(
        "Sounds good.\n\nOn Mon, Oct 10, 2026 at 12:00 PM Acme Support <help@acme.com>\nwrote:\n> old",
      ),
    ).toBe("Sounds good.");
    expect(extractReplyText("Yes please\n-- \nJane Doe\nCEO")).toBe("Yes please");
    expect(extractReplyText("New text\n\n> quoted\n> more")).toBe("New text");
    expect(extractReplyText("Fine\n\n-----Original Message-----\nFrom: someone\nold text")).toBe(
      "Fine",
    );
    expect(extractReplyText("> only quoted")).toBe("> only quoted");
    expect(extractReplyText(null)).toBeNull();
  });

  test("references keep the root and the latest ids within a header line", () => {
    expect(replyReferences(["<a@x>", "b@x"], "<c@x>")).toEqual(["<a@x>", "<b@x>", "<c@x>"]);
    const many = Array.from(
      { length: 40 },
      (_, index) => `<${"m".repeat(30)}${index}@example.com>`,
    );
    const kept = replyReferences(many, "<parent@example.com>");
    expect(kept[0]).toBe(many[0]);
    expect(kept.at(-1)).toBe("<parent@example.com>");
    expect(kept.join(" ").length).toBeLessThanOrEqual(900);
  });
});

describe("inboxes", () => {
  test("creates inboxes at the environment's inbound domain, once per client id", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox, created } = await createInbox(
      env,
      { username: "support-agent", displayName: "Acme Support", clientId: "agent-1" },
      deps,
    );
    expect(created).toBe(true);
    expect(InboxObject.parse(inbox)).toMatchObject({
      username: "support-agent",
      kind: "managed",
      display_name: "Acme Support",
      client_id: "agent-1",
      can_send: true,
      sandbox: true,
    });
    expect(inbox.address).toMatch(/^support-agent@[a-z2-9]{12}\.inbound\.coss\.test$/);

    const again = await createInbox(env, { clientId: "agent-1", username: "other" }, deps);
    expect(again).toEqual({ inbox, created: false });

    const random = await createInbox(env, {}, deps);
    expect(random.inbox.username).toMatch(/^agent-[a-z2-9]{10}$/);
    expect(random.inbox.domain).toBe(inbox.domain);

    const taken = await refusal(createInbox(env, { username: "support-agent" }, deps));
    expect(taken).toMatchObject({ code: "address_taken", param: "username" });

    const unknown = await refusal(createInbox(env, { domain: "agents.example.com" }, deps));
    expect(unknown).toMatchObject({ code: "unknown_domain", param: "domain" });
    const off = await refusal(createInbox(env, {}, { managedDomain: null }));
    expect(off.code).toBe("receiving_unavailable");

    const page = await listInboxes({ ...env, limit: 1 });
    expect(page.hasMore).toBe(true);
    expect(page.data[0]?.id).toBe(random.inbox.id);
    const next = await listInboxes({ ...env, limit: 10, after: page.data[0]?.id });
    expect(next.data.map((item) => item.id)).toEqual([inbox.id]);

    const renamed = await updateInbox({ ...env, id: inbox.id }, { displayName: null });
    expect(renamed.display_name).toBeNull();
    expect(await deleteInbox({ ...env, id: inbox.id })).toBe(true);
    expect(await deleteInbox({ ...env, id: inbox.id })).toBe(false);
    // Other organizations can't touch it.
    const other = await createTestTenant();
    expect(await deleteInbox({ ...sandbox(other), id: random.inbox.id })).toBe(false);
  });

  test("live inboxes at the managed domain only receive; receiving domains send", async () => {
    const tenant = await createTestTenant();
    const env = live(tenant);
    const managed = await createInbox(env, { username: "bot" }, deps);
    expect(managed.inbox.can_send).toBe(false);
    const refused = await refusal(
      sendInboxMessage(service, {
        environment: env,
        apiKeyId: null,
        inboxId: managed.inbox.id,
        request: { to: "jane@example.com", subject: "Hi", text: "Hello" },
      }),
    );
    expect(refused.code).toBe("inbox_cannot_send");

    const parent = await createVerifiedDomain(tenant.organization.id);
    await createReceivingDomain(
      {
        organizationId: tenant.organization.id,
        domainId: parent.id,
        environmentId: tenant.production.id,
        hostname: `agents.${parent.name}`,
      },
      { mxHost: "inbound-smtp.us-east-1.amazonaws.com", managedDomain: MANAGED },
      null,
    );
    const own = await createInbox(env, { username: "bot", domain: `Agents.${parent.name}.` }, deps);
    expect(own.inbox).toMatchObject({
      kind: "domain",
      address: `bot@agents.${parent.name}`,
      can_send: true,
    });
    const sent = await sendInboxMessage(service, {
      environment: env,
      apiKeyId: null,
      inboxId: own.inbox.id,
      request: { to: "jane@example.com", subject: "Your order", text: "It shipped." },
    });
    expect(sent.message).toMatchObject({ direction: "outbound", status: "sent" });
  });

  test("a receiving domain that moves takes its addresses along", async () => {
    const tenant = await createTestTenant();
    const parent = await createVerifiedDomain(tenant.organization.id);
    const hostname = `agents.${parent.name}`;
    const receiving = (environmentId: string) =>
      createReceivingDomain(
        { organizationId: tenant.organization.id, domainId: parent.id, environmentId, hostname },
        { mxHost: "inbound-smtp.us-east-1.amazonaws.com", managedDomain: MANAGED },
        null,
      );
    await receiving(tenant.production.id);
    const old = await createInbox(live(tenant), { username: "bot", domain: hostname }, deps);
    await deleteReceivingDomain({ organizationId: tenant.organization.id, domainId: parent.id });
    await receiving(tenant.development.id);
    const moved = await createInbox(sandbox(tenant), { username: "bot", domain: hostname }, deps);
    expect(moved.inbox.address).toBe(old.inbox.address);
    expect(moved.inbox.id).not.toBe(old.inbox.id);
    // Mail now reaches the new environment's inbox only.
    await receive({ to: [moved.inbox.address], subject: "Hi", text: "Hello" });
    const threads = (inboxId: string, env: InboxEnvironment) =>
      listInboxThreads({ ...env, inboxId, limit: 10 }).then((page) => page.data.length);
    expect(await threads(moved.inbox.id, sandbox(tenant))).toBe(1);
    expect(await threads(old.inbox.id, live(tenant))).toBe(0);
  });

  test("received mail becomes threads, with an inbox.message.received webhook", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        url: "https://example.com/hook",
        eventTypes: ["inbox.message.received"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
    const { inbox } = await createInbox(env, { username: "help" }, deps);
    const other = await createInbox(env, { username: "sales" }, deps);
    const firstId = `<first-${uniqueSuffix()}@example.com>`;
    const [outcome] = await receive({
      to: [inbox.address],
      // A subaddress reaches the inbox too.
      recipients: [inbox.address.replace("help@", "help+orders@")],
      subject: "My order arrived damaged",
      text: "Hi, the order arrived damaged.\n\nJane",
      messageId: firstId,
    });
    expect(outcome?.kind).toBe("received");

    const threads = await listInboxThreads({ ...env, inboxId: inbox.id, limit: 10 });
    expect(threads.data).toHaveLength(1);
    const [thread] = threads.data;
    expect(thread).toMatchObject({
      subject: "My order arrived damaged",
      participants: ["jane@example.com"],
      message_count: 1,
      preview: "Hi, the order arrived damaged. Jane",
    });
    expect(thread?.last_inbound_at).toBe(thread?.last_message_at ?? "");
    expect((await listInboxThreads({ ...env, inboxId: other.inbox.id, limit: 10 })).data).toEqual(
      [],
    );

    const [delivery] = await db
      .select({ payload: schema.webhookMessage.payload })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id));
    const event = InboxMessageReceivedWebhookEvent.parse(
      renderWebhookPayload(delivery?.payload ?? {}, LATEST_API_VERSION),
    );
    expect(event.data).toMatchObject({
      inbox_id: inbox.id,
      inbox_address: inbox.address,
      thread_id: thread?.id,
      new_thread: true,
      subject: "My order arrived damaged",
      sandbox: true,
      received_email_id: outcome?.kind === "received" ? outcome.receivedEmailId : "",
    });
    expect(JSON.stringify(event)).not.toContain("arrived damaged.");

    // A reply by reference joins the thread, whatever its subject.
    await receive({
      to: [inbox.address],
      subject: "something else",
      text: "Any news?\n\nOn Mon, Oct 10, 2026 at 12:00 PM Jane <jane@example.com> wrote:\n> Hi",
      headers: { "In-Reply-To": firstId, References: firstId },
    });
    // The same subject from someone already in the thread joins it too; from a stranger it doesn't.
    await receive({ to: [inbox.address], subject: "RE: my order arrived damaged", text: "Hello?" });
    await receive({
      to: [inbox.address],
      from: "mallory@example.net",
      subject: "Re: My order arrived damaged",
      text: "Unrelated",
    });

    const all = await listInboxThreads({ ...env, inboxId: inbox.id, limit: 10 });
    expect(all.data).toHaveLength(2);
    const joined = await getInboxThread({ ...env, inboxId: inbox.id, id: thread?.id ?? "" });
    expect(joined?.message_count).toBe(3);
    expect(joined?.messages.map((message) => message.extracted_text)).toEqual([
      "Hi, the order arrived damaged.\n\nJane",
      "Any news?",
      "Hello?",
    ]);
    expect(joined?.messages[0]).toMatchObject({
      direction: "inbound",
      status: "received",
      message_id: firstId,
      from: "Jane <jane@example.com>",
    });

    const messages = await listInboxMessages({ ...env, inboxId: inbox.id, limit: 2 });
    expect(messages.hasMore).toBe(true);
    expect(messages.data[0]).toMatchObject({ from: "mallory@example.net", preview: "Unrelated" });
    expect(messages.data[0]).not.toHaveProperty("text");
  });

  test("sends start threads and replies continue them, by reference and subject", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "agent", displayName: "Acme Bot" }, deps);
    const sendInput = { environment: env, apiKeyId: null, inboxId: inbox.id };

    const { message: sent } = await sendInboxMessage(service, {
      ...sendInput,
      idempotencyKey: "first",
      request: {
        to: ["Jane <jane@example.com>"],
        subject: "Quick question",
        text: "Do you still need help?",
      },
    });
    expect(sent).toMatchObject({
      direction: "outbound",
      status: "sent",
      from: `"Acme Bot" <${inbox.address}>`,
      to: ["Jane <jane@example.com>"],
      subject: "Quick question",
      extracted_text: "Do you still need help?",
    });
    const replay = await sendInboxMessage(service, {
      ...sendInput,
      idempotencyKey: "first",
      request: {
        to: ["Jane <jane@example.com>"],
        subject: "Quick question",
        text: "Do you still need help?",
      },
    });
    expect(replay).toEqual({ message: sent, replayed: true, contentStorage: "store" });

    // Jane replies to the sent message: SES-style `Message-ID` of its provider id.
    const [row] = await db
      .select({ providerMessageId: schema.email.providerMessageId })
      .from(schema.email)
      .where(eq(schema.email.id, sent.email_id ?? ""));
    const sentId = `<${row?.providerMessageId}@email.amazonses.com>`;
    const janeId = `<jane-${uniqueSuffix()}@example.com>`;
    await receive({
      to: [inbox.address],
      subject: "Different subject",
      text: "Yes, please call me.",
      messageId: janeId,
      headers: { "In-Reply-To": sentId, References: sentId },
    });
    const thread = await getInboxThread({ ...env, inboxId: inbox.id, id: sent.thread_id });
    expect(thread?.messages.map((message) => message.direction)).toEqual(["outbound", "inbound"]);
    const inbound = thread?.messages[1];

    const { message: reply } = await replyToInboxMessage(service, {
      ...sendInput,
      messageId: inbound?.id ?? "",
      request: { text: "Calling you now.", reply_all: true },
    });
    expect(reply).toMatchObject({
      thread_id: sent.thread_id,
      to: ["Jane <jane@example.com>"],
      cc: [],
      subject: "Re: Different subject",
      in_reply_to: janeId,
      references: [sentId, janeId],
    });
    const full = await getInboxMessage({ ...env, inboxId: inbox.id, id: reply.id });
    expect(full?.text).toBe("Calling you now.");

    // A follow-up to the inbox's own message goes to the same recipients.
    const { message: followUp } = await replyToInboxMessage(service, {
      ...sendInput,
      messageId: sent.id,
      request: { text: "Following up.", cc: ["boss@example.com", inbox.address] },
    });
    // It references the inbox's own first message, by the Message-ID its provider gave it.
    const sentMessageId = `<${row?.providerMessageId}@fake.coss.test>`;
    expect(followUp).toMatchObject({
      to: ["Jane <jane@example.com>"],
      cc: ["boss@example.com"],
      subject: "Re: Quick question",
      thread_id: sent.thread_id,
      in_reply_to: sentMessageId,
      references: [sentMessageId],
    });
    const after = await getInboxThread({ ...env, inboxId: inbox.id, id: sent.thread_id });
    expect(after?.participants).toEqual(["jane@example.com", "boss@example.com"]);
    expect(after?.message_count).toBe(4);
    expect(after?.last_inbound_at).not.toBe(after?.last_message_at);

    const missing = await refusal(
      replyToInboxMessage(service, {
        ...sendInput,
        messageId: "imsg_missing",
        request: { text: "Hi" },
      }),
    );
    expect(missing.code).toBe("message_not_found");
    const invalid = await refusal(
      sendInboxMessage(service, {
        ...sendInput,
        request: { to: "jane@example.com", subject: "Hi" },
      }),
    );
    expect(invalid).toMatchObject({ code: "invalid_message", param: "html" });
  });

  test("a retried reply replays though what it was derived from changed since", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const queue = memoryDispatchQueue();
    const queued = createEmailService({
      liveProvider: new FakeEmailProvider({ log: false }),
      sandboxProvider: new FakeEmailProvider({ log: false }),
      queue,
      linkKeys: DEVELOPMENT_LINK_KEYS,
    });
    const { inbox } = await createInbox(env, { username: "retry", displayName: "Bot" }, deps);
    const base = { environment: env, apiKeyId: null, inboxId: inbox.id };
    const { message: first } = await sendInboxMessage(queued, {
      ...base,
      request: { to: "jane@example.com", subject: "Hello", text: "Hi" },
    });
    const reply = () =>
      replyToInboxMessage(queued, {
        ...base,
        idempotencyKey: "follow-up",
        messageId: first.id,
        request: { text: "Following up." },
      });
    // Sent while the first message is still queued: it has no Message-ID to reference yet.
    const original = await reply();
    expect(original.message.in_reply_to).toBeNull();
    await queue.drain(queued);
    await updateInbox({ ...env, id: inbox.id }, { displayName: "Renamed" });

    const retried = await reply();
    expect(retried).toMatchObject({ replayed: true, message: { id: original.message.id } });
    const changed = await replyToInboxMessage(queued, {
      ...base,
      idempotencyKey: "follow-up",
      messageId: first.id,
      request: { text: "Something else." },
    }).then(
      () => null,
      (error: unknown) => error,
    );
    expect(changed).toMatchObject({ code: "idempotency_key_reused" });
  });

  test("without content storage, a sent message's thread keeps no copy of its subject", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    await updateStorageSettings(
      { organizationId: env.organizationId, environmentId: env.environmentId },
      { contentStorage: "discard" },
    );
    const { inbox } = await createInbox(env, { username: "private" }, deps);
    const { message, contentStorage } = await sendInboxMessage(service, {
      environment: env,
      apiKeyId: null,
      inboxId: inbox.id,
      request: { to: "jane@example.com", subject: "Secret plans", text: "Shh." },
    });
    expect(contentStorage).toBe("discard");
    const [thread] = await db
      .select()
      .from(schema.inboxThread)
      .where(eq(schema.inboxThread.id, message.thread_id));
    expect(thread).toMatchObject({ subject: null, subjectKey: "" });
    const read = await getInboxThread({ ...env, inboxId: inbox.id, id: message.thread_id });
    expect(JSON.stringify(read)).not.toContain("Secret plans");
  });

  test("a sender's display name a send would refuse becomes the bare address", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "names" }, deps);
    await receive({
      to: [inbox.address, `${"Long ".repeat(60)}<long@example.com>`],
      from: "Jane \u200d Doe <jane@example.com>",
      subject: "Names",
      text: "Hi",
    });
    const [summary] = (await listInboxMessages({ ...env, inboxId: inbox.id, limit: 1 })).data;
    const { message } = await replyToInboxMessage(service, {
      environment: env,
      apiKeyId: null,
      inboxId: inbox.id,
      messageId: summary?.id ?? "",
      request: { text: "Hello", reply_all: true },
    });
    expect(message.to).toEqual(["jane@example.com"]);
    expect(message.cc).toEqual(["long@example.com"]);
  });

  test("reply-all answers everyone but the inbox; Reply-To wins over From", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "desk" }, deps);
    await receive({
      to: [inbox.address, "Ann <ann@example.com>"],
      subject: "Team question",
      text: "Hi all",
      headers: { "Reply-To": "list@example.com", Cc: "bob@example.com" },
    });
    const [thread] = (await listInboxThreads({ ...env, inboxId: inbox.id, limit: 1 })).data;
    const messages = await listInboxMessages({ ...env, inboxId: inbox.id, limit: 1 });
    const { message } = await replyToInboxMessage(service, {
      environment: env,
      apiKeyId: null,
      inboxId: inbox.id,
      messageId: messages.data[0]?.id ?? "",
      request: { text: "Answer", reply_all: true },
    });
    expect(message).toMatchObject({
      thread_id: thread?.id,
      to: ["list@example.com"],
      cc: ["Ann <ann@example.com>", "bob@example.com"],
    });
  });

  test("a message without a From header keeps its content and can be replied to", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "nofrom" }, deps);
    const raw = new TextEncoder().encode(
      [
        `To: ${inbox.address}`,
        "Reply-To: answers@example.com",
        "Subject: No sender",
        `Message-ID: <nofrom-${uniqueSuffix()}@example.com>`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Who sent this?",
        "",
      ].join("\r\n"),
    );
    await receiveFakeEmail(
      { raw, mailFrom: "", recipients: [inbox.address], subject: "No sender" },
      deps,
    );
    const [summary] = (await listInboxMessages({ ...env, inboxId: inbox.id, limit: 1 })).data;
    const message = await getInboxMessage({ ...env, inboxId: inbox.id, id: summary?.id ?? "" });
    expect(message).toMatchObject({
      from: null,
      subject: "No sender",
      extracted_text: "Who sent this?",
      reply_to: ["answers@example.com"],
    });
    const { message: reply } = await replyToInboxMessage(service, {
      environment: env,
      apiKeyId: null,
      inboxId: inbox.id,
      messageId: message?.id ?? "",
      request: { text: "Me." },
    });
    expect(reply.to).toEqual(["answers@example.com"]);
  });

  test("oversized subjects and message ids from senders still file into threads", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "huge" }, deps);
    // Random, so it doesn't compress under the index's entry limit.
    const subject = Array.from({ length: 300 }, () => uniqueSuffix()).join(" ");
    const longId = `<${"x".repeat(4000)}@example.com>`;
    const [first] = await receive({ to: [inbox.address], subject, text: "One", messageId: longId });
    expect(first?.kind).toBe("received");
    // The subject still matches; the oversized id is simply not used.
    await receive({
      to: [inbox.address],
      subject: `Re: ${subject}`,
      text: "Two",
      headers: { "In-Reply-To": longId },
    });
    const threads = await listInboxThreads({ ...env, inboxId: inbox.id, limit: 10 });
    expect(threads.data.map((thread) => thread.message_count)).toEqual([2]);
  });

  test("a delayed notification files an older message in its place in the thread", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "late" }, deps);
    const firstId = `<early-${uniqueSuffix()}@example.com>`;
    const now = Date.now();
    await receive({
      to: [inbox.address],
      subject: "Order",
      text: "First",
      messageId: firstId,
      receivedAt: new Date(now - 60_000),
    });
    await receive({
      to: [inbox.address],
      subject: "Re: Order",
      text: "Third",
      headers: { "In-Reply-To": firstId },
      receivedAt: new Date(now),
    });
    // Received between the two, but its notification arrives last.
    await receive({
      to: [inbox.address],
      subject: "Re: Order",
      text: "Second",
      headers: { "In-Reply-To": firstId },
      receivedAt: new Date(now - 30_000),
    });
    const [summary] = (await listInboxThreads({ ...env, inboxId: inbox.id, limit: 1 })).data;
    expect(summary?.preview).toBe("Third");
    const thread = await getInboxThread({ ...env, inboxId: inbox.id, id: summary?.id ?? "" });
    expect(thread?.messages.map((message) => message.extracted_text)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
  });

  test("deleting emails empties threads; the purge drops empty ones", async () => {
    const tenant = await createTestTenant();
    const env = sandbox(tenant);
    const { inbox } = await createInbox(env, { username: "purge" }, deps);
    const [outcome] = await receive({ to: [inbox.address], subject: "Gone soon", text: "bye" });
    const [thread] = (await listInboxThreads({ ...env, inboxId: inbox.id, limit: 1 })).data;
    await deleteReceivedEmail(
      { ...env, id: outcome?.kind === "received" ? outcome.receivedEmailId : "" },
      store,
    );
    // Hidden from lists once empty.
    expect((await listInboxThreads({ ...env, inboxId: inbox.id, limit: 10 })).data).toEqual([]);
    expect(await getInboxThread({ ...env, inboxId: inbox.id, id: thread?.id ?? "" })).toBeNull();
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeEmptyInboxThreads({ limit: 10, scope })).toBe(0);
    const tomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(await purgeEmptyInboxThreads({ now: tomorrow, limit: 10, scope })).toBe(1);

    await receive({ to: [inbox.address], subject: "Another", text: "hi" });
    const [kept] = (await listInboxThreads({ ...env, inboxId: inbox.id, limit: 1 })).data;
    expect(await deleteInboxThread({ ...env, inboxId: inbox.id, id: kept?.id ?? "" })).toBe(true);
    expect((await listInboxThreads({ ...env, inboxId: inbox.id, limit: 10 })).data).toEqual([]);
    // The received email stays the environment's.
    const received = await db
      .select({ id: schema.receivedEmail.id })
      .from(schema.receivedEmail)
      .where(eq(schema.receivedEmail.environmentId, tenant.development.id));
    expect(received).toHaveLength(1);
  });

  test("live inboxes are charged a day at a time; sandbox ones are free", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const scope = { organizationIds: [org] };
    const hours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000);
    const { inbox } = await createInbox(live(tenant), { username: "billed" }, deps);
    const { inbox: gone } = await createInbox(live(tenant), { username: "brief" }, deps);
    await createInbox(sandbox(tenant), { username: "free" }, deps);
    // The first day of each live inbox is charged at creation.
    expect(await inboxDays(org)).toBe(2);
    expect(await chargeDueInboxFees({ scope })).toBe(0);
    await deleteInbox({ ...live(tenant), id: gone.id });
    expect(await chargeDueInboxFees({ now: hours(25), scope })).toBe(1);
    expect(await chargeDueInboxFees({ now: hours(25), scope })).toBe(0);
    expect(await inboxDays(org)).toBe(3);
    // Behind by two days: one per run until caught up.
    expect(await chargeDueInboxFees({ now: hours(73), scope })).toBe(1);
    expect(await chargeDueInboxFees({ now: hours(73), scope })).toBe(1);
    expect(await chargeDueInboxFees({ now: hours(73), scope })).toBe(0);
    expect(await inboxDays(org)).toBe(5);
    const [row] = await db
      .select({ nextFeeAt: schema.inbox.nextFeeAt })
      .from(schema.inbox)
      .where(eq(schema.inbox.id, inbox.id));
    expect(row?.nextFeeAt?.getTime()).toBeGreaterThan(hours(73).getTime());
  });

  test("the plan limits an organization's inboxes; Free's inbox-days are capped", async () => {
    const tenant = await createTestTenant();
    const gated = { ...deps, plans: createPlanGate(), billing: createUsageGate() };
    // Free: 3 inboxes, sandbox ones included.
    await createInbox(sandbox(tenant), {}, gated);
    await createInbox(sandbox(tenant), {}, gated);
    await createInbox(live(tenant), {}, gated);
    const full = await billingRefusal(createInbox(live(tenant), {}, gated));
    expect(full.code).toBe("plan_limit_reached");

    const churned = await createTestTenant();
    await db.insert(schema.billingQuota).values({
      organizationId: churned.organization.id,
      meter: "email.inboxes",
      periodStart: periodOf(new Date()).start,
      reserved: 93,
    });
    const used = await billingRefusal(createInbox(live(churned), { username: "late" }, gated));
    expect(used.code).toBe("usage_limit_exceeded");
    // Refused before anything was kept; sandbox inboxes aren't charged, so not capped.
    expect(await listInboxes({ ...live(churned), limit: 10 })).toMatchObject({ data: [] });
    await createInbox(sandbox(churned), { username: "late" }, gated);
  });
});
