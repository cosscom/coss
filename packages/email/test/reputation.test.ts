import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import {
  type CheckContext,
  DEFAULT_REPUTATION_POLICY,
  evaluateOrganization,
  getReputationStanding,
  isSuspended,
  listReputationEvents,
  listReputationNotifications,
  type ReputationPolicy,
  reinstateMarketing,
  suspendOrganization,
} from "@coss/reputation";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq, inArray } from "drizzle-orm";
import { authorizeLiveSender } from "../src/domains.ts";
import { EmailError } from "../src/errors.ts";
import { ingestProviderEvents } from "../src/events.ts";
import type { ProviderEvent } from "../src/provider.ts";
import { FakeEmailProvider, SIMULATOR_DOMAIN } from "../src/providers/fake.ts";
import {
  countSlices,
  emailReputationChecks,
  ROLLUP_SETTLE_MS,
  sendingCounts,
} from "../src/reputation-checks.ts";
import { addSuppression, suppressedRecipients } from "../src/suppressions.ts";
import { dispatchingEmailService } from "../src/testing.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

const provider = new FakeEmailProvider({ log: false });
const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });

/** Sends one live email to `to`; returns its id and provider message id. */
async function liveSend(tenant: TestTenant, from: string, to: string[]) {
  const { email } = await service.send({
    environment: sendEnvironment(tenant.production),
    apiKeyId: null,
    params: params({ from, to }),
  });
  const [row] = await db
    .select({ providerMessageId: schema.email.providerMessageId })
    .from(schema.email)
    .where(eq(schema.email.id, email.id));
  return { id: email.id, providerMessageId: row?.providerMessageId ?? null };
}

function bounce(
  sent: { id: string; providerMessageId: string | null },
  recipient: string,
  type: "permanent" | "transient",
): ProviderEvent {
  return {
    provider: "fake",
    providerEventType: "Bounce",
    emailId: sent.id,
    providerMessageId: sent.providerMessageId,
    type: "email.bounced",
    recipients: [recipient],
    occurredAt: new Date(),
    sourceId: crypto.randomUUID(),
    data: { bounce: { type, sub_type: "General", diagnostic_code: null } },
  };
}

function complaint(sent: { id: string; providerMessageId: string | null }, recipient: string) {
  return {
    ...bounce(sent, recipient, "permanent"),
    providerEventType: "Complaint",
    type: "email.complained" as const,
    data: { complaint: { feedback_type: "abuse", sub_type: null } },
  };
}

function context(tenant: TestTenant, policy: Partial<ReputationPolicy> = {}): CheckContext {
  const now = new Date(Date.now() + 1000);
  return {
    organizationId: tenant.organization.id,
    now,
    windowStart: new Date(now.getTime() - 86_400_000),
    marketingWindowStart: new Date(now.getTime() - 86_400_000),
    policy: { ...DEFAULT_REPUTATION_POLICY, ...policy },
  };
}

const recipients = (count: number, prefix = "user") =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}@example.com`);

describe("email reputation checks", () => {
  test("count live recipients, permanent bounces and complaints", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const sent = await liveSend(tenant, from, recipients(10));
    await ingestProviderEvents([
      bounce(sent, "user0@example.com", "permanent"),
      bounce(sent, "user1@example.com", "permanent"),
      // Transient bounces don't hurt reputation.
      bounce(sent, "user2@example.com", "transient"),
      complaint(sent, "user3@example.com"),
    ]);

    expect(await sendingCounts(context(tenant))).toEqual({
      recipients: 10,
      bounces: 2,
      complaints: 1,
    });
  });

  test("leave out sandbox sends, suppressed recipients, simulator addresses and old emails", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ to: [`bounce@${SIMULATOR_DOMAIN}`, "sandbox@example.com"] }),
    });
    await addSuppression(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      { address: "blocked@example.com", scope: "*" },
    );
    // `blocked@` is skipped (suppressed) and the simulator bounce is not counted.
    await liveSend(tenant, from, [`bounce@${SIMULATOR_DOMAIN}`, "a@example.com"]);
    await liveSend(tenant, from, ["blocked@example.com", "b@example.com"]);

    expect(await sendingCounts(context(tenant))).toEqual({
      recipients: 2,
      bounces: 0,
      complaints: 0,
    });
    // Testing override: the simulator bounce counts.
    expect(await sendingCounts(context(tenant, { countSimulatorRecipients: true }))).toEqual({
      recipients: 3,
      bounces: 1,
      complaints: 0,
    });
    const future = context(tenant);
    expect(
      await sendingCounts({ ...future, windowStart: new Date(future.now.getTime() - 500) }),
    ).toEqual({ recipients: 0, bounces: 0, complaints: 0 });
  });

  test("a live bounce marks the organization due; the guard then suspends it", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const sent = await liveSend(tenant, from, recipients(10));
    expect(await getReputationStanding(orgId)).toBeNull();

    await ingestProviderEvents([bounce(sent, "user0@example.com", "permanent")]);
    expect((await getReputationStanding(orgId))?.nextEvaluationAt).not.toBeNull();

    const outcome = await evaluateOrganization(
      orgId,
      { checks: emailReputationChecks },
      { now: new Date(Date.now() + 1000) },
    );
    // Default policy: 10 recipients is below every minimum volume.
    expect(outcome.status).toBe("good");
    expect(outcome.metrics.checks.map((check) => [check.trigger, check.count])).toEqual([
      ["bounce_rate", 1],
      ["complaint_rate", 0],
      ["marketing_bounce_rate", 0],
      ["marketing_complaint_rate", 0],
    ]);

    await db
      .update(schema.reputationStanding)
      .set({ policyOverrides: { bounceRate: { minimumRecipients: 10 } } })
      .where(eq(schema.reputationStanding.organizationId, orgId));
    const after = await evaluateOrganization(
      orgId,
      { checks: emailReputationChecks },
      { now: new Date(Date.now() + 1000) },
    );
    expect(after).toMatchObject({ status: "suspended", transitioned: true });
  });

  test("sandbox bounces never mark the organization due", async () => {
    const tenant = await createTestTenant();
    await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params({ to: [`bounce@${SIMULATOR_DOMAIN}`, `complaint@${SIMULATOR_DOMAIN}`] }),
    });
    expect(await getReputationStanding(tenant.organization.id)).toBeNull();
  });
});

describe("the send gate", () => {
  test("a suspended organization can't send live, but sandbox and replays still work", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const live = {
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from }),
      idempotencyKey: "reputation-replay",
    };
    const first = await service.send(live);

    await suspendOrganization({
      organizationId: orgId,
      trigger: "manual",
      actor: { kind: "system" },
    });
    expect(await isSuspended(orgId)).toBe(true);

    const error = await service
      .send({ ...live, idempotencyKey: undefined })
      .then(() => null)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(EmailError);
    expect(error).toMatchObject({ code: "account_suspended", status: 403 });
    // Even from an unverified domain, suspension is what the customer is told.
    await expect(
      service.send({ ...live, idempotencyKey: undefined, params: params({ from: "x@nope.test" }) }),
    ).rejects.toMatchObject({ code: "account_suspended" });

    expect(await service.send(live)).toEqual({ email: first.email, replayed: true });
    const sandbox = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    expect(sandbox.replayed).toBe(false);
  });
});

test("successful sending across minimum volume is caught by the scheduled recheck", async () => {
  const { markReputationDue, runDueReputationEvaluations, WARNING_RECHECK_MS } = await import(
    "@coss/reputation"
  );
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const from = await verifiedFrom(organizationId);
  const sent = await liveSend(tenant, from, recipients(50));
  await ingestProviderEvents(recipients(20).map((address) => bounce(sent, address, "permanent")));
  for (const [count, prefix] of [
    [50, "second"],
    [50, "third"],
    [49, "fourth"],
  ] as const) {
    await liveSend(tenant, from, recipients(count, prefix));
  }
  const now = new Date();
  const scope = { organizationIds: [organizationId] };
  await markReputationDue(db, organizationId, now);
  await runDueReputationEvaluations({ now, scope }, { checks: emailReputationChecks });
  expect(await getReputationStanding(organizationId)).toMatchObject({
    status: "good",
    nextEvaluationAt: new Date(now.getTime() + WARNING_RECHECK_MS),
  });
  await liveSend(tenant, from, ["last@example.com"]);
  expect(
    await runDueReputationEvaluations(
      { now: new Date(now.getTime() + WARNING_RECHECK_MS), scope },
      { checks: emailReputationChecks },
    ),
  ).toBe(1);
  expect(await isSuspended(organizationId)).toBe(true);
});

describe("hourly rollups", () => {
  const HOUR = 3_600_000;
  const hourStart = (ms: number) => Math.floor(ms / HOUR) * HOUR;

  /** Moves emails back in time (created and sent), into closed (rolled-up) hours. */
  async function backdate(emailIds: string[], createdAt: Date) {
    await db
      .update(schema.email)
      .set({ createdAt, sentAt: createdAt })
      .where(inArray(schema.email.id, emailIds));
  }

  const rollups = (organizationId: string) =>
    db
      .select()
      .from(schema.emailReputationRollup)
      .where(eq(schema.emailReputationRollup.organizationId, organizationId));

  async function direct(tenant: TestTenant, ctx: CheckContext) {
    const total = { recipients: 0, bounces: 0, complaints: 0 };
    const slices = await countSlices(tenant.organization.id, ctx.windowStart, ctx.now, {
      inclusive: true,
    });
    for (const slice of slices.values()) {
      total.recipients += slice.recipients;
      total.bounces += slice.bounces;
      total.complaints += slice.complaints;
    }
    return total;
  }

  function weekContext(tenant: TestTenant, policy: Partial<ReputationPolicy> = {}): CheckContext {
    const now = new Date(Date.now() + 1000);
    return {
      organizationId: tenant.organization.id,
      now,
      // Mid-hour, so the window has a partial head hour.
      windowStart: new Date(hourStart(now.getTime() - 7 * 86_400_000) + HOUR / 2),
      marketingWindowStart: new Date(hourStart(now.getTime() - 7 * 86_400_000) + HOUR / 2),
      policy: { ...DEFAULT_REPUTATION_POLICY, ...policy },
    };
  }

  test("closed hours are counted once, stored, and match a live count", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const old = await liveSend(tenant, from, recipients(6, "old"));
    const older = await liveSend(tenant, from, recipients(4, "older"));
    const fresh = await liveSend(tenant, from, recipients(3, "fresh"));
    await ingestProviderEvents([
      bounce(old, "old0@example.com", "permanent"),
      complaint(older, "older0@example.com"),
      bounce(fresh, "fresh0@example.com", "permanent"),
    ]);
    const now = Date.now();
    await backdate([old.id], new Date(now - 5 * HOUR));
    await backdate([older.id], new Date(now - 3 * 86_400_000));

    const ctx = weekContext(tenant);
    const expected = { recipients: 13, bounces: 2, complaints: 1 };
    expect(await direct(tenant, ctx)).toEqual(expected);
    expect(await sendingCounts(ctx)).toEqual(expected);

    const rows = await rollups(orgId);
    // Every closed hour of the window has a current row; the fresh email's hour is still open.
    expect(rows.length).toBeGreaterThan(24 * 6);
    expect(rows.every((row) => row.computedRevision === row.revision)).toBe(true);
    const oldRow = rows.find((row) => row.bucketStart.getTime() === hourStart(now - 5 * HOUR));
    expect(oldRow).toMatchObject({ recipients: 6, bounces: 1, complaints: 0 });
    expect(rows.some((row) => row.bucketStart.getTime() >= now - ROLLUP_SETTLE_MS - HOUR)).toBe(
      false,
    );

    // Second run reads the stored rows.
    expect(await sendingCounts(ctx)).toEqual(expected);
  });

  test("late evidence invalidates the email's hour, which is recounted", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const sent = await liveSend(tenant, from, recipients(5));
    const createdAt = new Date(Date.now() - 2 * 86_400_000);
    await backdate([sent.id], createdAt);
    const ctx = weekContext(tenant);
    expect(await sendingCounts(ctx)).toEqual({ recipients: 5, bounces: 0, complaints: 0 });

    const bucket = and(
      eq(schema.emailReputationRollup.organizationId, orgId),
      eq(schema.emailReputationRollup.bucketStart, new Date(hourStart(createdAt.getTime()))),
    );
    const [before] = await db.select().from(schema.emailReputationRollup).where(bucket);
    await ingestProviderEvents([complaint(sent, "user1@example.com")]);
    const [after] = await db.select().from(schema.emailReputationRollup).where(bucket);
    expect(after?.revision).toBe((before?.revision ?? 0) + 1);
    expect(after?.computedRevision).toBe(before?.revision ?? null);

    expect(await sendingCounts(ctx)).toEqual({ recipients: 5, bounces: 0, complaints: 1 });
    const [recounted] = await db.select().from(schema.emailReputationRollup).where(bucket);
    expect(recounted).toMatchObject({ complaints: 1, computedRevision: after?.revision });
  });

  test("emails count when they were sent: a send scheduled weeks ahead counts when it goes out", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const scheduled = await liveSend(tenant, from, recipients(4, "late"));
    const createdAt = new Date(Date.now() - 20 * 86_400_000);
    const sentAt = new Date(Date.now() - 3 * HOUR);
    await db
      .update(schema.email)
      .set({ createdAt, sentAt })
      .where(eq(schema.email.id, scheduled.id));
    await ingestProviderEvents([bounce(scheduled, "late0@example.com", "permanent")]);

    const ctx = weekContext(tenant);
    // Created 20 days ago, outside the week; sent 3 hours ago, inside it.
    expect(await sendingCounts(ctx)).toEqual({ recipients: 4, bounces: 1, complaints: 0 });
    const [rollup] = await rollups(orgId).then((rows) => rows.filter((row) => row.recipients > 0));
    expect(rollup?.bucketStart).toEqual(new Date(hourStart(sentAt.getTime())));

    // Late evidence invalidates the hour it was sent in, not the hour it was created in.
    const sentHour = and(
      eq(schema.emailReputationRollup.organizationId, orgId),
      eq(schema.emailReputationRollup.bucketStart, new Date(hourStart(sentAt.getTime()))),
    );
    const [before] = await db.select().from(schema.emailReputationRollup).where(sentHour);
    await ingestProviderEvents([complaint(scheduled, "late1@example.com")]);
    const [after] = await db.select().from(schema.emailReputationRollup).where(sentHour);
    expect(after?.revision).toBe((before?.revision ?? 0) + 1);
    expect(await sendingCounts(ctx)).toEqual({ recipients: 4, bounces: 1, complaints: 1 });
  });

  test("events for emails of open hours never touch the rollups", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const sent = await liveSend(tenant, from, recipients(2));
    await ingestProviderEvents([complaint(sent, "user0@example.com")]);
    expect(await rollups(tenant.organization.id)).toEqual([]);
  });

  test("simulator recipients are kept apart, so the policy can choose", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const sent = await liveSend(tenant, from, [`bounce@${SIMULATOR_DOMAIN}`, "a@example.com"]);
    await backdate([sent.id], new Date(Date.now() - 4 * HOUR));
    expect(await sendingCounts(weekContext(tenant))).toEqual({
      recipients: 1,
      bounces: 0,
      complaints: 0,
    });
    expect(await sendingCounts(weekContext(tenant, { countSimulatorRecipients: true }))).toEqual({
      recipients: 2,
      bounces: 1,
      complaints: 0,
    });
  });

  test("a window starting mid-hour leaves out that hour's earlier sends", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const before = await liveSend(tenant, from, ["before@example.com"]);
    const after = await liveSend(tenant, from, ["after@example.com"]);
    const hour = hourStart(Date.now() - 10 * HOUR);
    await backdate([before.id], new Date(hour + 10 * 60_000));
    await backdate([after.id], new Date(hour + 40 * 60_000));
    const now = new Date(Date.now() + 1000);
    const ctx: CheckContext = {
      organizationId: tenant.organization.id,
      now,
      // e.g. a reinstatement at :30
      windowStart: new Date(hour + 30 * 60_000),
      marketingWindowStart: new Date(hour + 30 * 60_000),
      policy: DEFAULT_REPUTATION_POLICY,
    };
    expect(await sendingCounts(ctx)).toEqual({ recipients: 1, bounces: 0, complaints: 0 });
  });

  test("canceled scheduled sends don't count as volume", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const { email } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({
        from,
        to: ["later@example.com"],
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    });
    await service.cancel({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      emailId: email.id,
    });
    expect(await sendingCounts(context(tenant))).toEqual({
      recipients: 0,
      bounces: 0,
      complaints: 0,
    });
  });
});

describe("the marketing stream", () => {
  /** A live send recorded as marketing (the public `stream` field ships with broadcasts). */
  async function marketingSend(tenant: TestTenant, from: string, to: string[]) {
    const sent = await liveSend(tenant, from, to);
    await db.update(schema.email).set({ stream: "marketing" }).where(eq(schema.email.id, sent.id));
    return sent;
  }

  test("transactional rates leave marketing emails out, and the other way round", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    await liveSend(tenant, from, recipients(3, "tx"));
    const sent = await marketingSend(tenant, from, recipients(4, "mkt"));
    await ingestProviderEvents([bounce(sent, "mkt0@example.com", "permanent")]);

    expect(await sendingCounts(context(tenant))).toEqual({
      recipients: 3,
      bounces: 0,
      complaints: 0,
    });
    expect(await sendingCounts(context(tenant), "marketing")).toEqual({
      recipients: 4,
      bounces: 1,
      complaints: 0,
    });
  });

  test("a marketing breach pauses marketing only, until an admin reinstates it", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const sent = await marketingSend(tenant, from, recipients(10));
    await ingestProviderEvents([bounce(sent, "user0@example.com", "permanent")]);
    await db
      .update(schema.reputationStanding)
      .set({ policyOverrides: { marketingBounceRate: { minimumRecipients: 10 } } })
      .where(eq(schema.reputationStanding.organizationId, orgId));

    const now = new Date(Date.now() + 1000);
    const outcome = await evaluateOrganization(orgId, { checks: emailReputationChecks }, { now });
    // The organization's standing is untouched: only marketing stops.
    expect(outcome.status).toBe("good");
    const standing = await getReputationStanding(orgId);
    expect(standing?.marketingPausedAt).not.toBeNull();
    expect(standing?.marketingReason).toBe("marketing_bounce_rate");
    expect((await listReputationEvents(orgId)).map((event) => event.type)).toEqual([
      "marketing_paused",
    ]);
    expect((await listReputationNotifications(orgId)).map((row) => row.type)).toEqual([
      "marketing_paused",
    ]);

    await authorizeLiveSender({ organizationId: orgId, from, provider: "fake" });
    await expect(
      authorizeLiveSender({ organizationId: orgId, from, provider: "fake", stream: "marketing" }),
    ).rejects.toMatchObject({ code: "marketing_paused" });

    // Never lifted by the guard, even with healthy rates.
    await db
      .update(schema.reputationStanding)
      .set({ policyOverrides: null })
      .where(eq(schema.reputationStanding.organizationId, orgId));
    await evaluateOrganization(orgId, { checks: emailReputationChecks });
    expect((await getReputationStanding(orgId))?.marketingPausedAt).not.toBeNull();

    await reinstateMarketing({ organizationId: orgId, adminUserId: tenant.owner.id, note: "ok" });
    const reinstated = await getReputationStanding(orgId);
    expect(reinstated?.marketingPausedAt).toBeNull();
    expect(reinstated?.marketingReinstatedAt).not.toBeNull();
    await authorizeLiveSender({
      organizationId: orgId,
      from,
      provider: "fake",
      stream: "marketing",
    });
    await expect(
      reinstateMarketing({ organizationId: orgId, adminUserId: tenant.owner.id, note: "again" }),
    ).rejects.toMatchObject({ code: "marketing_not_paused" });
  });

  test("coss.com's own organization is never paused", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const from = await verifiedFrom(orgId);
    const sent = await marketingSend(tenant, from, recipients(10));
    await ingestProviderEvents([bounce(sent, "user0@example.com", "permanent")]);
    await db
      .update(schema.reputationStanding)
      .set({ policyOverrides: { marketingBounceRate: { minimumRecipients: 10 } } })
      .where(eq(schema.reputationStanding.organizationId, orgId));
    await evaluateOrganization(orgId, {
      checks: emailReputationChecks,
      systemOrganizationId: orgId,
    });
    expect((await getReputationStanding(orgId))?.marketingPausedAt).toBeNull();
  });

  test("a complaint about marketing suppresses marketing only; a bounce suppresses everything", async () => {
    const tenant = await createTestTenant();
    const from = await verifiedFrom(tenant.organization.id);
    const sent = await marketingSend(tenant, from, ["fan@example.com", "gone@example.com"]);
    await ingestProviderEvents([
      complaint(sent, "fan@example.com"),
      bounce(sent, "gone@example.com", "permanent"),
    ]);
    const rows = await db
      .select({ address: schema.emailSuppression.address, scope: schema.emailSuppression.scope })
      .from(schema.emailSuppression)
      .where(eq(schema.emailSuppression.environmentId, tenant.production.id));
    expect(rows.sort((a, b) => a.address.localeCompare(b.address))).toEqual([
      { address: "fan@example.com", scope: "stream:marketing" },
      { address: "gone@example.com", scope: "*" },
    ]);
    const env = sendEnvironment(tenant.production);
    const addresses = ["fan@example.com", "gone@example.com"];
    const transactional = await suppressedRecipients(db, env, addresses, null);
    expect([...transactional.keys()]).toEqual(["gone@example.com"]);
    const marketing = await suppressedRecipients(db, env, addresses, null, "marketing");
    expect([...marketing.keys()].sort()).toEqual(addresses);
  });
});
