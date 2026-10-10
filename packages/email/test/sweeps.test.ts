import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq, sql } from "drizzle-orm";
import { ingestProviderEvents } from "../src/events.ts";
import { getEmail, listEmailEvents } from "../src/read.ts";
import { createEmailService } from "../src/service.ts";
import { STALE_CLAIM_MS, sweepStaleClaims } from "../src/sweeps.ts";
import { gatedProvider, params, sendEnvironment } from "./helpers.ts";

/** An email claimed by a dispatcher that never came back, as if its process died. */
async function interruptedEmail(tenant: TestTenant) {
  const gated = gatedProvider("fake");
  const service = createEmailService({
    liveProvider: gated.provider,
    sandboxProvider: gated.provider,
  });
  void service.send({
    environment: sendEnvironment(tenant.development),
    apiKeyId: null,
    params: params(),
  });
  await gated.called;
  const [message] = gated.sent;
  if (!message) throw new Error("not sent");
  // Pretend the claim happened long ago.
  await db
    .update(schema.email)
    .set({ updatedAt: sql`now() - interval '1 hour'` })
    .where(eq(schema.email.id, message.emailId));
  return { emailId: message.emailId, release: gated.release };
}

const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

describe("sweepStaleClaims", () => {
  test("fails an interrupted email, and a late Send event still repairs it", async () => {
    const tenant = await createTestTenant();
    const { emailId, release } = await interruptedEmail(tenant);
    const read = () =>
      getEmail({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        id: emailId,
      });

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(1);
    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(0);
    expect(await read()).toMatchObject({ status: "failed", recipients: [{ status: "failed" }] });
    const listed = await listEmailEvents({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      emailId,
    });
    expect(listed?.events.map((e) => [e.type, e.data.failure?.code])).toEqual([
      ["email.failed", "dispatch_interrupted"],
    ]);

    await ingestProviderEvents([
      {
        provider: "fake",
        providerEventType: "Send",
        emailId,
        providerMessageId: "fake_late",
        type: "email.sent",
        recipients: null,
        occurredAt: new Date(),
        sourceId: "fake_late",
        data: {},
      },
    ]);
    expect(await read()).toMatchObject({ status: "sent", recipients: [{ status: "sent" }] });
    release();
  });

  test("marks an email sent when the provider already reported it", async () => {
    const tenant = await createTestTenant();
    const { emailId, release } = await interruptedEmail(tenant);
    // The Send event arrived, but the dispatcher died before recording its own outcome.
    await db.insert(schema.emailEvent).values({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      emailId,
      type: "email.sent",
      provider: "fake",
      providerEventType: "Send",
      occurredAt: new Date(),
      dedupeKey: "manual",
    });

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(1);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, emailId));
    expect(row).toMatchObject({ status: "sent", errorCode: null });
    release();
  });

  test("leaves recent claims alone", async () => {
    const tenant = await createTestTenant();
    const { emailId, release } = await interruptedEmail(tenant);
    await db
      .update(schema.email)
      .set({ updatedAt: new Date() })
      .where(eq(schema.email.id, emailId));

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(0);
    expect(
      await sweepStaleClaims({
        scope: scopeOf(tenant),
        now: new Date(Date.now() + STALE_CLAIM_MS + 1000),
      }),
    ).toBe(1);
    release();
  });
});
