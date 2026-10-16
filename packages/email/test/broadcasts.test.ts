import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { addAudienceContacts, createAudience, deleteAudience } from "../src/audiences.ts";
import { renderBroadcast, renderTemplate, templateKeys } from "../src/broadcast-render.ts";
import { CreateBroadcastRequest } from "../src/broadcast-schemas.ts";
import { recipientMoveCounts, recountBroadcastStats } from "../src/broadcast-stats.ts";
import {
  BROADCAST_BACKLOG,
  type BroadcastWorkerDeps,
  cancelBroadcast,
  createBroadcast,
  deleteBroadcast,
  getBroadcast,
  getBroadcastRow,
  listBroadcastEmails,
  pauseBroadcast,
  resumeBroadcast,
  runDueBroadcasts,
  sendBroadcast,
  updateBroadcast,
} from "../src/broadcasts.ts";
import { createContactProperty } from "../src/contact-properties.ts";
import { UpsertContactRequest } from "../src/contact-schemas.ts";
import { upsertContact } from "../src/contacts.ts";
import { EmailError } from "../src/errors.ts";
import { DEVELOPMENT_LINK_KEYS, readLinkToken } from "../src/link-tokens.ts";
import { updateMarketingSettings } from "../src/marketing-settings.ts";
import { applyPreferences } from "../src/preferences.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail } from "../src/read.ts";
import { createEmailService } from "../src/service.ts";
import { addSuppression } from "../src/suppressions.ts";
import { memoryDispatchQueue } from "../src/testing.ts";
import { createTopic } from "../src/topics.ts";
import { recordOpen } from "../src/tracking.ts";
import { sendEnvironment, verifiedFrom } from "./helpers.ts";

describe("templates", () => {
  test("keys, fallbacks and escaping per part", () => {
    const template = "Hi {{{contact.first_name|there}}} {{{ contact.plan }}} {{{unsubscribe_url}}}";
    expect(templateKeys(template, "{{{contact.email}}}")).toEqual(["email", "first_name", "plan"]);
    expect(renderTemplate(template, { first_name: "<b>Ada</b>" }, "html")).toBe(
      "Hi &lt;b&gt;Ada&lt;/b&gt;  {{{unsubscribe_url}}}",
    );
    expect(renderTemplate(template, {}, "text")).toBe("Hi there  {{{unsubscribe_url}}}");
    expect(
      renderTemplate("{{{contact.first_name}}}!", { first_name: "A\r\nBcc: x" }, "subject"),
    ).toBe("A Bcc: x!");
  });

  test("the preview line is a hidden preheader right after <body>", () => {
    const rendered = renderBroadcast(
      { subject: "S", html: "<html><body><p>Hi</p></body></html>", text: null, previewText: "P&Q" },
      {},
    );
    expect(rendered.html).toBe(
      '<html><body><div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">P&amp;Q</div><p>Hi</p></body></html>',
    );
  });

  test("counters follow recipient moves and never count twice", () => {
    const counts = recipientMoveCounts([
      { from: "queued", to: "sent" },
      { from: "sent", to: "delivered" },
      { from: "delivered", to: "complained" },
      { from: "queued", to: "failed" },
      { from: "failed", to: "queued" },
    ]);
    expect(Object.fromEntries(counts)).toEqual({
      sent: 1,
      delivered: 1,
      complained: 1,
      failed: 0,
    });
  });
});

const BODY = "<p>Hi {{{contact.first_name|there}}}, you are on {{{contact.plan|free}}}.</p>";

async function fixture(opts: { live?: boolean } = {}) {
  const tenant = await createTestTenant();
  const environment = opts.live ? tenant.production : tenant.development;
  const env = { organizationId: tenant.organization.id, environmentId: environment.id };
  const from = opts.live ? await verifiedFrom(tenant.organization.id) : "Acme <news@acme.test>";
  await updateMarketingSettings(env, { mailing_address: "1 Main St, Springfield" });
  await createContactProperty(env, { key: "plan", type: "string" });
  await createTopic(env, { key: "news", name: "News", default_subscription: "opt_in" });
  const audience = await createAudience(env, { name: "Everyone" });
  const contacts: string[] = [];
  for (const [address, extra] of [
    ["ada@example.com", { first_name: "Ada", properties: { plan: "pro" } }],
    ["bob@example.com", {}],
    ["cy@example.com", { first_name: "Cy" }],
    ["gone@example.com", { status: "unsubscribed" }],
    ["out@example.com", { topics: [{ topic: "news", status: "opted_out" }] }],
    ["bounced@example.com", {}],
  ] as const) {
    const { contact } = await upsertContact(
      env,
      UpsertContactRequest.parse({ email: address, ...extra }),
      { source: "api" },
    );
    contacts.push(contact.id);
  }
  await addAudienceContacts(env, audience.id, contacts);
  await addSuppression(env, { address: "bounced@example.com", scope: "*" });
  const provider = new FakeEmailProvider({ log: false });
  const queue = memoryDispatchQueue();
  const service = createEmailService({
    liveProvider: provider,
    sandboxProvider: provider,
    queue,
    trackingBaseUrl: "https://track.test",
    linkKeys: DEVELOPMENT_LINK_KEYS,
  });
  const deps: BroadcastWorkerDeps = { queue, liveProvider: "fake" };
  /** Dispatches the queued jobs; a dropped email's job finds nothing, as in pg-boss. */
  const drain = async () => {
    for (const job of queue.jobs.splice(0)) {
      await service.dispatch(job).catch((error: unknown) => {
        if (!(error instanceof EmailError && error.code === "not_found")) throw error;
      });
    }
  };
  const create = (overrides: Record<string, unknown> = {}) =>
    createBroadcast(
      { ...sendEnvironment(environment), apiKeyId: null },
      CreateBroadcastRequest.parse({
        name: "October",
        audience_id: audience.id,
        topic: "news",
        from,
        subject: "News for {{{contact.first_name|you}}}",
        html: BODY,
        tracking: { opens: true },
        ...overrides,
      }),
      { liveProvider: "fake" },
    ).then((result) => result.broadcast);
  const scope = { organizationIds: [tenant.organization.id] };
  /** Runs the worker until the broadcast settles (each step with a fresh lease). */
  const runUntil = async (id: string, status: string, max = 20) => {
    for (let step = 0; step < max; step++) {
      await db
        .update(schema.broadcast)
        .set({ nextRunAt: new Date(0) })
        .where(eq(schema.broadcast.id, id));
      await runDueBroadcasts(deps, { scope });
      await drain();
      const row = await getBroadcastRow(env, id);
      if (row?.status === status) return row;
    }
    throw new Error(`broadcast ${id} never reached ${status}`);
  };
  return {
    tenant,
    env,
    environment,
    audience,
    contacts,
    provider,
    queue,
    service,
    deps,
    create,
    scope,
    runUntil,
    drain,
  };
}

const emailsOf = (organizationId: string, broadcastId: string) =>
  db
    .select()
    .from(schema.email)
    .where(
      and(
        eq(schema.email.organizationId, organizationId),
        eq(schema.email.broadcastId, broadcastId),
      ),
    );

describe("broadcasts", () => {
  test("a draft is edited, sent, fanned out to the eligible contacts and counted", async () => {
    const f = await fixture();
    const draft = await f.create();
    expect(draft.status).toBe("draft");
    const edited = await updateBroadcast(f.env, draft.id, { name: "October news" });
    expect(edited?.name).toBe("October news");

    const scheduled = await sendBroadcast(sendEnvironment(f.environment), draft.id, {
      liveProvider: "fake",
    });
    expect(scheduled?.status).toBe("scheduled");
    await expect(updateBroadcast(f.env, draft.id, { name: "x" })).rejects.toMatchObject({
      code: "broadcast_not_editable",
    });

    const sent = await f.runUntil(draft.id, "sent");
    expect(sent.recipientsEstimated).toBe(3);
    const emails = await emailsOf(f.tenant.organization.id, draft.id);
    // Unsubscribed, opted out of the topic and suppressed contacts get nothing.
    expect(emails.map((row) => row.to[0]).sort()).toEqual([
      "ada@example.com",
      "bob@example.com",
      "cy@example.com",
    ]);
    for (const row of emails) {
      expect(row.html).toBeNull();
      expect(row.stream).toBe("marketing");
      expect(row.category).toBe("news");
      expect(row.status).toBe("sent");
    }
    const ada = emails.find((row) => row.to[0] === "ada@example.com");
    expect(ada?.subject).toBe("News for Ada");
    expect(ada?.variables).toEqual({ first_name: "Ada", plan: "pro" });

    // Rendered at dispatch: the contact's values, the footer, the unsubscribe header.
    const message = f.provider.sent.find((entry) => entry.emailId === ada?.id);
    expect(message?.html).toContain("Hi Ada, you are on pro.");
    expect(message?.html).toContain("1 Main St, Springfield");
    expect(message?.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    // …and the same way on read.
    const read = await getEmail({ ...f.env, id: ada?.id as string });
    expect(read?.html).toContain("Hi Ada, you are on pro.");
    expect(read?.broadcast_id).toBe(draft.id);

    const object = await getBroadcast(f.env, draft.id);
    expect(object?.stats).toMatchObject({ recipients: 3, sent: 3, delivered: 3, failed: 0 });
    const { unsubscribed: _, ...stats } = object?.stats ?? {};
    expect(await recountBroadcastStats(f.tenant.organization.id, draft.id)).toEqual(
      stats as Awaited<ReturnType<typeof recountBroadcastStats>>,
    );
    const page = await listBroadcastEmails(f.env, draft.id, { limit: 2 });
    expect(page?.data).toHaveLength(2);
    expect(page?.has_more).toBe(true);

    // Opens and unsubscribes through its links count once per email.
    await recordOpen({ token: ada?.trackingToken as string, userAgent: null });
    await recordOpen({
      token: ada?.trackingToken as string,
      userAgent: null,
      now: new Date(Date.now() + 2 * 60 * 60_000),
    });
    const header = message?.headers["List-Unsubscribe"] ?? "";
    const link = readLinkToken(
      DEVELOPMENT_LINK_KEYS,
      header.slice(header.lastIndexOf("/") + 1, -1),
      "preferences",
    );
    if (!link) throw new Error("no unsubscribe link");
    await applyPreferences(link, { kind: "unsubscribe" });
    await applyPreferences(link, { kind: "unsubscribe" });
    expect((await getBroadcast(f.env, draft.id))?.stats).toMatchObject({
      opened: 1,
      unsubscribed: 1,
    });

    // A sent broadcast can't be deleted; its audience can be again.
    await expect(deleteBroadcast(f.env, draft.id)).rejects.toMatchObject({
      code: "broadcast_not_editable",
    });
    expect(await deleteAudience(f.env, f.audience.id)).toBe(true);
  });

  test("its audience can't be deleted while it is unfinished", async () => {
    const f = await fixture();
    const draft = await f.create();
    await expect(deleteAudience(f.env, f.audience.id)).rejects.toMatchObject({
      code: "audience_in_use",
    });
    expect(await deleteBroadcast(f.env, draft.id)).toBe(true);
    expect(await deleteAudience(f.env, f.audience.id)).toBe(true);
  });

  test("needs a postal address to start", async () => {
    const f = await fixture();
    await updateMarketingSettings(f.env, { mailing_address: null });
    await expect(f.create({ send: true })).rejects.toMatchObject({
      code: "mailing_address_required",
    });
  });

  test("an idempotency key returns the first broadcast", async () => {
    const f = await fixture();
    const env = { ...sendEnvironment(f.environment), apiKeyId: null };
    const body = CreateBroadcastRequest.parse({
      name: "Once",
      audience_id: f.audience.id,
      from: "news@acme.test",
      subject: "S",
      text: "T",
    });
    const first = await createBroadcast(env, body, { liveProvider: "fake", idempotencyKey: "k1" });
    const again = await createBroadcast(env, body, { liveProvider: "fake", idempotencyKey: "k1" });
    expect(again.replayed).toBe(true);
    expect(again.broadcast.id).toBe(first.broadcast.id);
    await expect(
      createBroadcast(
        env,
        { ...body, name: "Other" },
        { liveProvider: "fake", idempotencyKey: "k1" },
      ),
    ).rejects.toMatchObject({ code: "idempotency_key_reused" });
  });

  test("pausing drops unsent emails and rewinds; resuming makes them again", async () => {
    const f = await fixture();
    const broadcast = await f.create({ send: true });
    // Start, then one batch, without dispatching.
    await runDueBroadcasts(f.deps, { scope: f.scope });
    await db
      .update(schema.broadcast)
      .set({ nextRunAt: new Date(0) })
      .where(eq(schema.broadcast.id, broadcast.id));
    await runDueBroadcasts(f.deps, { scope: f.scope });
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(3);
    expect((await getBroadcast(f.env, broadcast.id))?.stats.recipients).toBe(3);

    const paused = await pauseBroadcast(f.env, broadcast.id);
    expect(paused).toMatchObject({ status: "paused", pause_reason: "paused" });
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(0);
    expect(paused?.stats.recipients).toBe(0);
    expect((await getBroadcastRow(f.env, broadcast.id))?.cursor).toBeNull();
    // Their dispatch jobs find nothing.
    await f.drain();
    expect(f.provider.sent).toHaveLength(0);

    const resumed = await resumeBroadcast(sendEnvironment(f.environment), broadcast.id, {
      liveProvider: "fake",
    });
    expect(resumed?.status).toBe("sending");
    await f.runUntil(broadcast.id, "sent");
    expect(f.provider.sent).toHaveLength(3);
    expect((await getBroadcast(f.env, broadcast.id))?.stats).toMatchObject({
      recipients: 3,
      sent: 3,
    });
  });

  test("canceling stops it for good", async () => {
    const f = await fixture();
    const broadcast = await f.create({ send: true });
    await runDueBroadcasts(f.deps, { scope: f.scope });
    const canceled = await cancelBroadcast(f.env, broadcast.id);
    expect(canceled?.status).toBe("canceled");
    expect((await cancelBroadcast(f.env, broadcast.id))?.status).toBe("canceled");
    await db
      .update(schema.broadcast)
      .set({ nextRunAt: new Date(0) })
      .where(eq(schema.broadcast.id, broadcast.id));
    expect(await runDueBroadcasts(f.deps, { scope: f.scope })).toBe(0);
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(0);
    // Nothing was made: it can be deleted.
    expect(await deleteBroadcast(f.env, broadcast.id)).toBe(true);
  });

  test("a worker whose lease was taken over writes nothing; a rerun makes no duplicates", async () => {
    const f = await fixture();
    const broadcast = await f.create({ send: true });
    await runDueBroadcasts(f.deps, { scope: f.scope });
    // Another worker took the lease meanwhile.
    const stolen = new Date(Date.now() + 60_000);
    let steals = 0;
    const deps: BroadcastWorkerDeps = {
      ...f.deps,
      planRate: async () => {
        steals++;
        await db
          .update(schema.broadcast)
          .set({ leaseUntil: stolen })
          .where(eq(schema.broadcast.id, broadcast.id));
        return 10;
      },
    };
    await db
      .update(schema.broadcast)
      .set({ nextRunAt: new Date(0) })
      .where(eq(schema.broadcast.id, broadcast.id));
    await runDueBroadcasts(deps, { scope: f.scope });
    expect(steals).toBe(1);
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(0);

    // A rerun of an already-made batch (its cursor lost) inserts nothing twice.
    await db
      .update(schema.broadcast)
      .set({ leaseUntil: null, nextRunAt: new Date(0) })
      .where(eq(schema.broadcast.id, broadcast.id));
    await runDueBroadcasts(f.deps, { scope: f.scope });
    await db
      .update(schema.broadcast)
      .set({ cursor: null, nextRunAt: new Date(0) })
      .where(eq(schema.broadcast.id, broadcast.id));
    await runDueBroadcasts(f.deps, { scope: f.scope });
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(3);
    expect((await getBroadcast(f.env, broadcast.id))?.stats.recipients).toBe(3);
  });

  test("live: screened once, throttled, and paced by the backlog", async () => {
    const f = await fixture({ live: true });
    let screened = 0;
    const throttled: number[] = [];
    let allow = false;
    const deps: BroadcastWorkerDeps = {
      ...f.deps,
      screen: async () => {
        screened++;
        return { action: "send", screening: null };
      },
      throttle: async ({ count }) => {
        throttled.push(count);
        return allow
          ? { allowed: true, retryAfterMs: null }
          : { allowed: false, retryAfterMs: 3000 };
      },
      planRate: async () => 1,
    };
    const broadcast = await f.create({ send: true });
    const run = async () => {
      await db
        .update(schema.broadcast)
        .set({ nextRunAt: new Date(0) })
        .where(eq(schema.broadcast.id, broadcast.id));
      await runDueBroadcasts(deps, { scope: f.scope });
    };
    await run();
    expect(screened).toBe(1);
    expect((await getBroadcastRow(f.env, broadcast.id))?.status).toBe("sending");
    await run();
    // Denied: put off by the limiter's wait, nothing made.
    expect(throttled).toEqual([3]);
    const row = await getBroadcastRow(f.env, broadcast.id);
    expect(row?.nextRunAt?.getTime()).toBeGreaterThan(Date.now() + 2000);
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(0);
    allow = true;
    await run();
    expect(await emailsOf(f.tenant.organization.id, broadcast.id)).toHaveLength(3);
    expect(screened).toBe(1);
    // Emails of a screened broadcast skip per-email screening.
    await f.drain();
    expect(f.provider.sent).toHaveLength(3);
    expect(BROADCAST_BACKLOG).toBeGreaterThan(0);
  });

  test("live: a screening block fails it; a held screening retries", async () => {
    const f = await fixture({ live: true });
    let verdict: "error" | "blocked" = "error";
    const deps: BroadcastWorkerDeps = {
      ...f.deps,
      screen: async () => ({
        action: "block",
        screening: { verdict } as never,
      }),
    };
    const broadcast = await f.create({ send: true });
    await runDueBroadcasts(deps, { scope: f.scope });
    expect(await getBroadcastRow(f.env, broadcast.id)).toMatchObject({
      status: "scheduled",
      screeningStatus: "held",
    });
    verdict = "blocked";
    await db
      .update(schema.broadcast)
      .set({ nextRunAt: new Date(0) })
      .where(eq(schema.broadcast.id, broadcast.id));
    await runDueBroadcasts(deps, { scope: f.scope });
    expect(await getBroadcast(f.env, broadcast.id)).toMatchObject({
      status: "failed",
      error: { code: "content_rejected" },
    });
  });
});
