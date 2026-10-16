/** Broadcasts through the built SDK against the in-process API, then the worker's fan-out. */
import { describe, expect, test } from "bun:test";
import { runDueBroadcasts } from "@coss/email";
import { cachedOverrides, setRateLimitOverride } from "@coss/ratelimit";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss } from "coss";
import { createTestApp, type TestApp } from "./helpers.ts";

function toRequest(input: string | URL | Request, init?: RequestInit): Request {
  return input instanceof Request ? new Request(input, init) : new Request(String(input), init);
}

function clientFor(app: TestApp, apiKey: string): Coss {
  return new Coss({
    apiKey,
    baseUrl: "http://api.test",
    fetch: (input, init) => Promise.resolve(app.fetch(toRequest(input, init))),
    maxRetries: 0,
  });
}

describe("coss.email.broadcasts against the API", () => {
  test("create, edit, test, send, fan out, stats; state errors are 422", async () => {
    const tenant = await createTestTenant();
    const { app, queue, dispatch, sandboxProvider } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);

    await coss.email.marketingSettings.update({ mailing_address: "1 Main St" });
    const audience = await coss.email.audiences.create({ name: "Everyone" });
    for (const email of ["ada@example.com", "bob@example.com"]) {
      await coss.email.contacts.upsert({
        email,
        first_name: email === "ada@example.com" ? "Ada" : undefined,
      });
    }
    await coss.email.audiences.addContacts(audience.data?.id as string, {
      contacts: ["ada@example.com", "bob@example.com"],
    });

    const missing = await coss.email.broadcasts.create({
      name: "Bad",
      audience_id: "aud_01k7c8m4q2f3e9v6t5r1n0p8yz",
      from: "news@acme.test",
      subject: "S",
      text: "T",
    });
    expect(missing.error).toMatchObject({ status: 422, code: "invalid_target" });

    const created = await coss.email.broadcasts.create(
      {
        name: "October",
        audience_id: audience.data?.id as string,
        from: "Acme <news@acme.test>",
        subject: "Hi {{{contact.first_name|there}}}",
        html: "<p>Hi {{{contact.first_name|there}}}</p>",
      },
      { idempotencyKey: "october" },
    );
    expect(created.error).toBeNull();
    const id = created.data?.id as string;
    expect(created.data).toMatchObject({ status: "draft", stats: { recipients: 0 } });

    const updated = await coss.email.broadcasts.update(id, { preview_text: "Our news" });
    expect(updated.data?.preview_text).toBe("Our news");

    const tested = await coss.email.broadcasts.test(id, {
      to: ["me@acme.test"],
      contact: "ada@example.com",
    });
    expect(tested.data?.email_ids).toHaveLength(1);
    await dispatch();
    expect(sandboxProvider.sent.at(-1)?.subject).toBe("[Test] Hi Ada");

    const sent = await coss.email.broadcasts.send(id);
    expect(sent.data?.status).toBe("scheduled");
    const edit = await coss.email.broadcasts.update(id, { name: "Late" });
    expect(edit.error).toMatchObject({ status: 422, code: "broadcast_not_editable" });
    const resume = await coss.email.broadcasts.resume(id);
    expect(resume.data?.status).toBe("scheduled");

    const deps = { queue, liveProvider: "fake" };
    // Each step later than the last one's lease and pause.
    for (let step = 1; step <= 5; step++) {
      await runDueBroadcasts(deps, {
        now: new Date(Date.now() + step * 120_000),
        scope: { organizationIds: [tenant.organization.id] },
      });
      await dispatch();
    }
    const done = await coss.email.broadcasts.get(id);
    expect(done.data).toMatchObject({
      status: "sent",
      recipients_estimated: 2,
      stats: { recipients: 2, sent: 2, delivered: 2 },
    });
    const emails = await coss.email.broadcasts.listEmails(id);
    expect(emails.data?.data.map((email) => email.broadcast_id)).toEqual([id, id]);
    expect(emails.data?.data.find((email) => email.to[0] === "ada@example.com")?.html).toContain(
      "Hi Ada",
    );

    const list = await coss.email.broadcasts.list({ status: "sent" });
    expect(list.data?.data.map((broadcast) => broadcast.id)).toEqual([id]);
    const cancel = await coss.email.broadcasts.cancel(id);
    expect(cancel.error).toMatchObject({ status: 422, code: "broadcast_not_sendable" });
    const remove = await coss.email.broadcasts.remove(id);
    expect(remove.error).toMatchObject({ status: 422, code: "broadcast_not_editable" });
    expect((await coss.email.broadcasts.get("bcast_nope")).error).toMatchObject({ status: 404 });
  });

  test("a draft is deleted; sending without a postal address is refused", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const coss = clientFor(app, tenant.sandboxKey);
    const audience = await coss.email.audiences.create({ name: "A" });
    const created = await coss.email.broadcasts.create({
      name: "Draft",
      audience_id: audience.data?.id as string,
      from: "news@acme.test",
      subject: "S",
      text: "T",
    });
    const id = created.data?.id as string;
    const refused = await coss.email.broadcasts.send(id);
    expect(refused.error).toMatchObject({ status: 422, code: "mailing_address_required" });
    expect((await coss.email.broadcasts.remove(id)).data).toEqual({
      object: "broadcast",
      id,
      deleted: true,
    });
  });

  test("test sends charge the send quota once per address", async () => {
    const tenant = await createTestTenant();
    await setRateLimitOverride({
      organizationId: tenant.organization.id,
      bucket: "email.sandbox_recipients.day",
      rule: { limit: 2, periodMs: 86_400_000 },
    });
    const { app } = createTestApp({ rateLimiter: memoryLimiter({ overrides: cachedOverrides() }) });
    const coss = clientFor(app, tenant.sandboxKey);
    await coss.email.marketingSettings.update({ mailing_address: "1 Main St" });
    const audience = await coss.email.audiences.create({ name: "Everyone" });
    const created = await coss.email.broadcasts.create({
      name: "Quota",
      audience_id: audience.data?.id as string,
      from: "news@acme.test",
      subject: "S",
      text: "T",
    });
    const id = created.data?.id as string;
    // One address listed twice is one email, charged once.
    const twice = await coss.email.broadcasts.test(id, { to: ["me@acme.test", "ME@acme.test"] });
    expect(twice.data?.email_ids).toHaveLength(1);
    const over = await coss.email.broadcasts.test(id, { to: ["a@acme.test", "b@acme.test"] });
    expect(over.error).toMatchObject({ status: 429, code: "quota_exceeded" });
    const last = await coss.email.broadcasts.test(id, { to: ["a@acme.test"] });
    expect(last.data?.email_ids).toHaveLength(1);
  });
});
