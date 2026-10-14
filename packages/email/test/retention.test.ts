import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq, inArray, sql } from "drizzle-orm";
import { receiveFakeEmail } from "../src/inbound.ts";
import { inboundAddressFor } from "../src/inbound-address.ts";
import { buildTestMessage } from "../src/inbound-mime.ts";
import { FakeInboundStore } from "../src/inbound-store.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import {
  purgeEmptyEmailBatches,
  purgeExpiredEmails,
  purgeExpiredFakeInboundObjects,
  purgeExpiredReceivedEmails,
  purgeExpiredReputationRollups,
} from "../src/retention.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });
const DAY_MS = 24 * 60 * 60 * 1000;

function service() {
  const provider = new FakeEmailProvider({ log: false });
  return dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
}

async function age(
  table: typeof schema.email | typeof schema.emailBatch,
  id: string,
  days: number,
) {
  await db
    .update(table)
    .set({ createdAt: sql`now() - make_interval(days => ${days})` })
    .where(eq(table.id, id));
}

async function emailIds(ids: string[]) {
  const rows = await db
    .select({ id: schema.email.id })
    .from(schema.email)
    .where(inArray(schema.email.id, ids));
  return rows.map((row) => row.id).sort();
}

describe("purgeExpiredEmails", () => {
  test("deletes old sent emails with their recipients and events, keeping recent and pending ones", async () => {
    const tenant = await createTestTenant();
    const emails = service();
    const environment = sendEnvironment(tenant.development);
    const send = (overrides = {}) =>
      emails.send({ environment, apiKeyId: null, params: params(overrides) });

    const { email: old } = await send();
    const { email: recent } = await send();
    const { email: scheduled } = await send({
      scheduled_at: new Date(Date.now() + DAY_MS).toISOString(),
    });
    expect(old.status).toBe("sent");
    expect(scheduled.status).toBe("scheduled");
    for (const id of [old.id, scheduled.id]) await age(schema.email, id, RETENTION_DAYS.emails + 1);
    await age(schema.email, recent.id, RETENTION_DAYS.emails - 1);

    expect(await purgeExpiredEmails({ scope: scopeOf(tenant) })).toBe(1);
    expect(await purgeExpiredEmails({ scope: scopeOf(tenant) })).toBe(0);
    expect(await emailIds([old.id, recent.id, scheduled.id])).toEqual(
      [recent.id, scheduled.id].sort(),
    );
    const leftovers = await Promise.all([
      db.select().from(schema.emailRecipient).where(eq(schema.emailRecipient.emailId, old.id)),
      db.select().from(schema.emailEvent).where(eq(schema.emailEvent.emailId, old.id)),
    ]);
    expect(leftovers).toEqual([[], []]);
  });

  test("honours the limit, oldest first", async () => {
    const tenant = await createTestTenant();
    const emails = service();
    const environment = sendEnvironment(tenant.development);
    const ids: string[] = [];
    for (const days of [60, 50, 47]) {
      const { email } = await emails.send({ environment, apiKeyId: null, params: params() });
      await age(schema.email, email.id, days);
      ids.push(email.id);
    }
    expect(await purgeExpiredEmails({ scope: scopeOf(tenant), limit: 2 })).toBe(2);
    expect(await emailIds(ids)).toEqual([ids[2] as string]);
  });
});

describe("purgeEmptyEmailBatches", () => {
  test("deletes an old batch only once its emails are gone", async () => {
    const tenant = await createTestTenant();
    const emails = service();
    const { batch } = await emails.sendBatch({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      emails: [params({ to: "a@example.com" }), params({ to: "b@example.com" })],
    });
    await age(schema.emailBatch, batch.id, RETENTION_DAYS.emails + 1);
    const [first, second] = batch.data;
    if (!first || !second) throw new Error("batch");
    await age(schema.email, first.id, RETENTION_DAYS.emails + 1);

    expect(await purgeExpiredEmails({ scope: scopeOf(tenant) })).toBe(1);
    expect(await purgeEmptyEmailBatches({ scope: scopeOf(tenant) })).toBe(0);

    await age(schema.email, second.id, RETENTION_DAYS.emails + 1);
    expect(await purgeExpiredEmails({ scope: scopeOf(tenant) })).toBe(1);
    expect(await purgeEmptyEmailBatches({ scope: scopeOf(tenant) })).toBe(1);
    const left = await db
      .select()
      .from(schema.emailBatch)
      .where(eq(schema.emailBatch.id, batch.id));
    expect(left).toEqual([]);
  });
});

describe("purgeExpiredReputationRollups", () => {
  test("deletes hours older than the longest window", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const hour = (daysAgo: number) =>
      new Date(Math.floor((Date.now() - daysAgo * DAY_MS) / 3_600_000) * 3_600_000);
    await db.insert(schema.emailReputationRollup).values([
      { organizationId, bucketStart: hour(RETENTION_DAYS.reputationRollups + 1) },
      { organizationId, bucketStart: hour(RETENTION_DAYS.reputationRollups - 1) },
    ]);

    expect(await purgeExpiredReputationRollups({ scope: scopeOf(tenant) })).toBe(1);
    const left = await db
      .select({ bucketStart: schema.emailReputationRollup.bucketStart })
      .from(schema.emailReputationRollup)
      .where(eq(schema.emailReputationRollup.organizationId, organizationId));
    expect(left).toEqual([{ bucketStart: hour(RETENTION_DAYS.reputationRollups - 1) }]);
  });
});

describe("received email retention", () => {
  test("purges received emails and fake content past their cutoffs", async () => {
    const tenant = await createTestTenant();
    const store = new FakeInboundStore();
    const { domain } = await inboundAddressFor(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      "inbound.coss.test",
    );
    const receive = async () => {
      const raw = buildTestMessage({ from: "a@example.com", to: [`x@${domain}`], subject: "Hi" });
      const [outcome] = await receiveFakeEmail(
        { raw, mailFrom: "a@example.com", recipients: [`x@${domain}`], subject: "Hi" },
        { store, managedDomain: "inbound.coss.test" },
      );
      if (outcome?.kind !== "received") throw new Error("not received");
      return outcome.receivedEmailId;
    };
    const old = await receive();
    const fresh = await receive();
    await db
      .update(schema.receivedEmail)
      .set({
        createdAt: sql`now() - make_interval(days => ${RETENTION_DAYS.receivedEmails + 1})`,
      })
      .where(eq(schema.receivedEmail.id, old));
    expect(await purgeExpiredReceivedEmails({ scope: scopeOf(tenant) })).toBe(1);
    const left = await db
      .select({ id: schema.receivedEmail.id })
      .from(schema.receivedEmail)
      .where(inArray(schema.receivedEmail.id, [old, fresh]));
    expect(left.map((row) => row.id)).toEqual([fresh]);

    // Content outlives its row by a day, like the S3 lifecycle rule.
    const prefix = `orgs/${tenant.organization.id}/`;
    await db
      .update(schema.inboundFakeObject)
      .set({
        createdAt: sql`now() - make_interval(days => ${RETENTION_DAYS.receivedEmails + 2})`,
      })
      .where(sql`${schema.inboundFakeObject.key} like ${`${prefix}%${old}%`}`);
    expect(await purgeExpiredFakeInboundObjects({ scope: scopeOf(tenant) })).toBe(1);
    const objects = await db
      .select({ key: schema.inboundFakeObject.key })
      .from(schema.inboundFakeObject)
      .where(eq(schema.inboundFakeObject.organizationId, tenant.organization.id));
    expect(objects.map((row) => row.key)).toEqual([expect.stringContaining(fresh)]);
  });
});
