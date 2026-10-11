import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import {
  type CheckContext,
  DEFAULT_REPUTATION_POLICY,
  evaluateOrganization,
  getReputationStanding,
  isSuspended,
  type ReputationPolicy,
  suspendOrganization,
} from "@coss/reputation";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { EmailError } from "../src/errors.ts";
import { ingestProviderEvents } from "../src/events.ts";
import type { ProviderEvent } from "../src/provider.ts";
import { FakeEmailProvider, SIMULATOR_DOMAIN } from "../src/providers/fake.ts";
import { emailReputationChecks, sendingCounts } from "../src/reputation-checks.ts";
import { addSuppression } from "../src/suppressions.ts";
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
