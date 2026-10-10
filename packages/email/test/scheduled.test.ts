import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq, sql } from "drizzle-orm";
import { EmailError } from "../src/errors.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail, listEmailEvents } from "../src/read.ts";
import { createEmailService } from "../src/service.ts";
import { addSuppression } from "../src/suppressions.ts";
import { sweepStaleClaims, sweepUnclaimedEmails } from "../src/sweeps.ts";
import { memoryDispatchQueue, trackingUrls } from "../src/testing.ts";
import { gatedProvider, params, sendEnvironment, verifiedFrom } from "./helpers.ts";

const HOUR = 60 * 60 * 1000;
const inAnHour = () => new Date(Date.now() + HOUR).toISOString();
const later = () => new Date(Date.now() + 2 * HOUR);
const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

function fakeProviders() {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false });
  return {
    liveProvider,
    sandboxProvider,
    service: createEmailService({ liveProvider, sandboxProvider, queue: memoryDispatchQueue() }),
  };
}

async function expectEmailError(promise: Promise<unknown>, code: EmailError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(EmailError);
  expect((error as EmailError).code).toBe(code);
}

async function eventsOf(
  tenant: TestTenant,
  emailId: string,
  environmentId = tenant.development.id,
) {
  const listed = await listEmailEvents({
    organizationId: tenant.organization.id,
    environmentId,
    emailId,
  });
  return (listed?.events ?? []).map((event) => [event.type, event.recipient]);
}

describe("scheduled sends", () => {
  test("a future scheduled_at stores the email without sending it", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const scheduledAt = inAnHour();

    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: scheduledAt }),
    });

    expect(email).toMatchObject({
      status: "scheduled",
      scheduled_at: scheduledAt,
      sent_at: null,
      recipients: [{ address: "user@example.com", status: "queued" }],
    });
    expect(sandboxProvider.sent).toHaveLength(0);
    expect(await eventsOf(tenant, email.id)).toEqual([["email.scheduled", null]]);
    // Not due yet.
    expect(await service.dispatchDue({ scope: scopeOf(tenant) })).toBe(0);
  });

  test("scheduled emails have no immediate job and are excluded from unclaimed recovery", async () => {
    const tenant = await createTestTenant();
    const provider = new FakeEmailProvider({ log: false });
    const queue = memoryDispatchQueue();
    const service = createEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      queue,
    });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });
    expect(queue.jobs).toHaveLength(0);
    await service.dispatch({ organizationId: tenant.organization.id, emailId: email.id });
    expect(provider.sent).toHaveLength(0);
    expect(await sweepUnclaimedEmails(queue, { now: later(), scope: scopeOf(tenant) })).toEqual({
      failed: 0,
      requeued: 0,
    });
    expect(await sweepStaleClaims({ now: later(), scope: scopeOf(tenant) })).toBe(0);
    expect(queue.jobs).toHaveLength(0);
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(1);
    expect(provider.sent).toHaveLength(1);
  });

  test("suspended organizations hold scheduled emails until suspension is lifted", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });
    await db
      .insert(schema.organizationSuspension)
      .values({ organizationId: tenant.organization.id, reason: "test" });
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(0);
    expect(sandboxProvider.sent).toHaveLength(0);
    expect(
      (
        await getEmail({
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          id: email.id,
        })
      )?.status,
    ).toBe("scheduled");
    await db
      .delete(schema.organizationSuspension)
      .where(eq(schema.organizationSuspension.organizationId, tenant.organization.id));
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(1);
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("scheduled sends instrument the provider HTML and retain the original", async () => {
    const tenant = await createTestTenant();
    const provider = new FakeEmailProvider({ log: false });
    const service = createEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
      queue: memoryDispatchQueue(),
      trackingBaseUrl: "https://api.coss.test",
    });
    const html = '<p><a href="https://example.com/start">Start</a></p>';
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ html, tracking: { opens: true, clicks: true }, scheduled_at: inAnHour() }),
    });
    expect(provider.sent).toHaveLength(0);
    await service.dispatchDue({ now: later(), scope: scopeOf(tenant) });
    const urls = trackingUrls(provider.sent[0]?.html ?? "");
    expect(urls.open).toStartWith("https://api.coss.test/t/o/");
    expect(urls.clicks).toHaveLength(1);
    expect(
      await getEmail({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        id: email.id,
      }),
    ).toMatchObject({ html, status: "sent", tracking: { opens: true, clicks: true } });
  });

  test.each(["sent", "canceled", "sender_rejected", "all_suppressed"] as const)(
    "retains scheduled attachment bytes, then purges them on %s",
    async (outcome) => {
      const tenant = await createTestTenant();
      const { service, sandboxProvider, liveProvider } = fakeProviders();
      const environment = outcome === "sender_rejected" ? tenant.production : tenant.development;
      const from =
        outcome === "sender_rejected"
          ? await verifiedFrom(tenant.organization.id)
          : "hello@example.com";
      const { email } = await service.send({
        environment: sendEnvironment(environment),
        apiKeyId: null,
        params: params({
          from,
          scheduled_at: inAnHour(),
          attachments: [
            {
              filename: "note.txt",
              content: Buffer.from("scheduled attachment").toString("base64"),
            },
          ],
        }),
      });
      const stored = () =>
        db
          .select()
          .from(schema.emailAttachment)
          .where(eq(schema.emailAttachment.emailId, email.id));
      expect((await stored())[0]?.content?.toString()).toBe("scheduled attachment");
      expect(email.attachments[0]).toMatchObject({ filename: "note.txt", size: 20 });
      expect(email.attachments[0]).not.toHaveProperty("content");
      if (outcome === "canceled") {
        await service.cancel({
          organizationId: tenant.organization.id,
          environmentId: environment.id,
          emailId: email.id,
        });
      } else {
        if (outcome === "sender_rejected") {
          await db
            .update(schema.domain)
            .set({ status: "failed" })
            .where(eq(schema.domain.organizationId, tenant.organization.id));
        }
        if (outcome === "all_suppressed") {
          await addSuppression(
            { organizationId: tenant.organization.id, environmentId: environment.id },
            { address: "user@example.com", scope: "*" },
          );
        }
        await service.dispatchDue({ now: later(), scope: scopeOf(tenant) });
      }
      expect((await stored())[0]?.content).toBeNull();
      expect(
        (
          await getEmail({
            organizationId: tenant.organization.id,
            environmentId: environment.id,
            id: email.id,
          })
        )?.status,
      ).toBe(outcome === "sent" || outcome === "canceled" ? outcome : "failed");
      expect(sandboxProvider.sent.length + liveProvider.sent.length).toBe(
        outcome === "sent" ? 1 : 0,
      );
      if (outcome === "sent")
        expect(sandboxProvider.sent[0]?.attachments[0]).toMatchObject({
          filename: "note.txt",
          size: 20,
        });
    },
  );

  test("bounds concurrent scheduled sends and stops between batches on shutdown", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
      queue: memoryDispatchQueue(),
    });
    for (let i = 0; i < 6; i++) {
      await service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: params({ scheduled_at: inAnHour() }),
      });
    }
    const controller = new AbortController();
    const dispatching = service.dispatchDue({
      now: later(),
      scope: scopeOf(tenant),
      signal: controller.signal,
    });
    try {
      await gated.called;
      const deadline = Date.now() + 2000;
      while (gated.sent.length < 5 && Date.now() < deadline) await Bun.sleep(10);
      expect(gated.sent).toHaveLength(5);
      controller.abort();
    } finally {
      gated.release();
      await dispatching;
    }
    expect(gated.sent).toHaveLength(5);
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(1);
    expect(gated.sent).toHaveLength(6);
  });

  test("a retry with the same idempotency key replays the scheduled email", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const input = {
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
      idempotencyKey: "schedule-once",
    };

    const first = await service.send(input);
    const retry = await service.send(input);

    expect(retry).toMatchObject({
      replayed: true,
      email: { id: first.email.id, status: "scheduled" },
    });
  });

  test("a scheduled_at that is not in the future sends immediately", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const past = new Date(Date.now() - 1000).toISOString();

    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: past }),
    });

    expect(email).toMatchObject({ status: "queued", scheduled_at: past });
    await service.dispatch({ organizationId: tenant.organization.id, emailId: email.id });
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("dispatchDue sends due emails once", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });

    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(1);
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(0);

    expect(sandboxProvider.sent.map((message) => message.emailId)).toEqual([email.id]);
    const sent = await getEmail({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      id: email.id,
    });
    expect(sent).toMatchObject({ status: "sent", recipients: [{ status: "delivered" }] });
    expect(sent?.sent_at).not.toBeNull();
  });

  test("concurrent dispatchers hand the email to the provider once", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      queue: memoryDispatchQueue(),
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });

    const first = service.dispatchDue({ now: later(), scope: scopeOf(tenant) });
    await gated.called;
    // The first dispatcher holds the claim; a second one finds nothing left to send.
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(0);
    gated.release();
    await first;

    expect(gated.sent.map((message) => message.emailId)).toEqual([email.id]);
  });

  test("an address suppressed after scheduling is skipped at dispatch", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ to: ["user@example.com", "gone@example.com"], scheduled_at: inAnHour() }),
    });
    await addSuppression(env, { address: "gone@example.com", scope: "*" });

    await service.dispatchDue({ now: later(), scope: scopeOf(tenant) });

    expect(sandboxProvider.sent[0]?.to).toEqual(["user@example.com"]);
    const sent = await getEmail({ ...env, id: email.id });
    expect(sent?.recipients.map((r) => [r.address, r.status])).toEqual([
      ["user@example.com", "delivered"],
      ["gone@example.com", "suppressed"],
    ]);
  });

  test("an email whose recipients were all suppressed meanwhile fails without a send", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });
    await addSuppression(env, { address: "user@example.com", scope: "*" });

    await service.dispatchDue({ now: later(), scope: scopeOf(tenant) });

    expect(sandboxProvider.sent).toHaveLength(0);
    expect(await getEmail({ ...env, id: email.id })).toMatchObject({
      status: "failed",
      recipients: [{ status: "suppressed" }],
    });
  });

  test("a live email whose domain is no longer verified fails at dispatch", async () => {
    const tenant = await createTestTenant();
    const { service, liveProvider } = fakeProviders();
    const from = await verifiedFrom(tenant.organization.id);
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from, scheduled_at: inAnHour() }),
    });
    await db
      .update(schema.domain)
      .set({ status: "failed" })
      .where(eq(schema.domain.organizationId, tenant.organization.id));

    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(1);

    expect(liveProvider.sent).toHaveLength(0);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row).toMatchObject({
      status: "failed",
      errorCode: "domain_not_verified",
      provider: null,
    });
    expect(await eventsOf(tenant, email.id, tenant.production.id)).toEqual([
      ["email.scheduled", null],
      ["email.failed", null],
    ]);
  });

  test("a dispatcher that dies after its claim is resolved by the stale-claim sweep", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      queue: memoryDispatchQueue(),
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });
    void service.dispatchDue({ now: later(), scope: scopeOf(tenant) });
    await gated.called;
    await db
      .update(schema.email)
      .set({ updatedAt: sql`now() - interval '1 hour'` })
      .where(eq(schema.email.id, email.id));

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(1);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, email.id));
    expect(row).toMatchObject({ status: "failed", errorCode: "dispatch_interrupted" });
    gated.release();
  });
});

describe("cancel", () => {
  test("cancels a scheduled email, keeping suppressed recipients suppressed", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    await addSuppression(env, { address: "gone@example.com", scope: "*" });
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ to: ["user@example.com", "gone@example.com"], scheduled_at: inAnHour() }),
    });

    const canceled = await service.cancel({ ...env, emailId: email.id });

    expect(canceled.status).toBe("canceled");
    expect(canceled.recipients.map((r) => [r.address, r.status])).toEqual([
      ["user@example.com", "canceled"],
      ["gone@example.com", "suppressed"],
    ]);
    expect(await eventsOf(tenant, email.id)).toEqual([
      ["email.scheduled", null],
      ["email.suppressed", "gone@example.com"],
      ["email.canceled", null],
    ]);
    // Canceling again is a no-op, and a canceled email is never dispatched.
    expect((await service.cancel({ ...env, emailId: email.id })).status).toBe("canceled");
    expect(await eventsOf(tenant, email.id)).toHaveLength(3);
    expect(await service.dispatchDue({ now: later(), scope: scopeOf(tenant) })).toBe(0);
    expect(sandboxProvider.sent).toHaveLength(0);
  });

  test("refuses emails that are not scheduled", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });

    await expectEmailError(service.cancel({ ...env, emailId: email.id }), "email_not_cancelable");
  });

  test("loses to a dispatcher that already claimed the email", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider("fake");
    const service = createEmailService({
      queue: memoryDispatchQueue(),
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });
    const dispatching = service.dispatchDue({ now: later(), scope: scopeOf(tenant) });
    await gated.called;

    await expectEmailError(service.cancel({ ...env, emailId: email.id }), "email_not_cancelable");
    gated.release();
    await dispatching;
    expect((await getEmail({ ...env, id: email.id }))?.status).toBe("sent");
  });

  test("is scoped to the environment", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ scheduled_at: inAnHour() }),
    });

    await expectEmailError(
      service.cancel({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        emailId: email.id,
      }),
      "not_found",
    );
    const other = await createTestTenant();
    await expectEmailError(
      service.cancel({
        organizationId: other.organization.id,
        environmentId: other.development.id,
        emailId: email.id,
      }),
      "not_found",
    );
  });
});
