import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, renderWebhookPayload } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { asc, eq } from "drizzle-orm";
import type { CheckContext, CheckResult, ReputationCheck } from "../src/checks.ts";
import { ReputationError } from "../src/errors.ts";
import {
  evaluateOrganization,
  runDueReputationEvaluations,
  WARNING_RECHECK_MS,
} from "../src/evaluate.ts";
import { AccountWebhookEvent, type CheckSeverity } from "../src/schemas.ts";
import {
  getReputation,
  getReputationStanding,
  isSuspended,
  listReputationEvents,
  markReputationDue,
} from "../src/standing.ts";
import {
  reinstateOrganization,
  suspendOrganization,
  updateReputationPolicy,
} from "../src/transitions.ts";

const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

/** A check whose verdict the test controls; records every context it was given. */
function controlledCheck(severity: CheckSeverity = "ok") {
  const state = { severity, contexts: [] as CheckContext[] };
  const check: ReputationCheck = {
    trigger: "bounce_rate",
    async evaluate(context): Promise<CheckResult> {
      state.contexts.push(context);
      return {
        trigger: "bounce_rate",
        severity: state.severity,
        message: `severity ${state.severity}`,
        rate: 0.1,
        count: 10,
        volume: 100,
        warningThreshold: 0.04,
        suspendThreshold: 0.08,
        minimumVolume: 1,
      };
    },
  };
  return { state, check, deps: { checks: [check] } };
}

async function webhookMessages(organizationId: string) {
  return db
    .select()
    .from(schema.webhookMessage)
    .where(eq(schema.webhookMessage.organizationId, organizationId))
    .orderBy(asc(schema.webhookMessage.createdAt));
}

describe("markReputationDue", () => {
  test("creates the standing and only ever moves the next evaluation earlier", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const later = new Date(Date.now() + 60_000);
    const earlier = new Date(Date.now() - 60_000);

    await markReputationDue(db, orgId, later);
    expect((await getReputationStanding(orgId))?.nextEvaluationAt).toEqual(later);
    await markReputationDue(db, orgId, earlier);
    expect((await getReputationStanding(orgId))?.nextEvaluationAt).toEqual(earlier);
    await markReputationDue(db, orgId, later);
    expect((await getReputationStanding(orgId))?.nextEvaluationAt).toEqual(earlier);
    expect((await getReputationStanding(orgId))?.status).toBe("good");
  });
});

describe("runDueReputationEvaluations", () => {
  test("warns, then suspends, and announces each change to live endpoints only", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    for (const environmentId of [tenant.production.id, tenant.development.id]) {
      await createWebhookEndpoint(
        {
          organizationId: orgId,
          environmentId,
          url: "http://127.0.0.1:9/hook",
          eventTypes: [],
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        testManagementDeps,
      );
    }
    const { state, deps } = controlledCheck("warning");
    const now = new Date();
    await markReputationDue(db, orgId, now);

    expect(await runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps)).toBe(1);
    let standing = await getReputationStanding(orgId);
    expect(standing).toMatchObject({
      status: "warning",
      reason: "bounce_rate",
      lastEvaluatedAt: now,
    });
    // Warned organizations are re-checked so a recovery clears the warning.
    expect(standing?.nextEvaluationAt).toEqual(new Date(now.getTime() + WARNING_RECHECK_MS));
    expect(await isSuspended(orgId)).toBe(false);

    state.severity = "suspend";
    const later = new Date(now.getTime() + WARNING_RECHECK_MS);
    expect(await runDueReputationEvaluations({ now: later, scope: scopeOf(tenant) }, deps)).toBe(1);
    standing = await getReputationStanding(orgId);
    expect(standing).toMatchObject({ status: "suspended", reason: "bounce_rate" });
    expect(standing?.nextEvaluationAt).toBeNull();
    expect(await isSuspended(orgId)).toBe(true);

    const history = await listReputationEvents(orgId);
    expect(history.map((event) => [event.type, event.actor])).toEqual([
      ["suspended", "system"],
      ["warning_raised", "system"],
    ]);
    expect(history[0]?.metrics).toMatchObject({ checks: [{ trigger: "bounce_rate", count: 10 }] });

    const messages = await webhookMessages(orgId);
    expect(messages.map((message) => [message.type, message.environmentId])).toEqual([
      ["account.reputation_warning", tenant.production.id],
      ["account.suspended", tenant.production.id],
    ]);
    const payload = AccountWebhookEvent.parse(
      renderWebhookPayload(messages[1]?.payload ?? {}, LATEST_API_VERSION),
    );
    expect(payload).toMatchObject({
      id: messages[1]?.id,
      type: "account.suspended",
      data: {
        organization_id: orgId,
        status: "suspended",
        previous_status: "warning",
        reason: "bounce_rate",
        checks: [{ trigger: "bounce_rate", severity: "suspend", rate: 0.1 }],
      },
    });

    const reputation = await getReputation(orgId);
    expect(reputation).toMatchObject({
      object: "reputation",
      status: "suspended",
      reason: "bounce_rate",
      evaluated_at: later.toISOString(),
      checks: [{ trigger: "bounce_rate", suspend_threshold: 0.08 }],
    });
  });

  test("a warning clears once every check is ok", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const { state, deps } = controlledCheck("warning");
    await evaluateOrganization(orgId, deps);
    state.severity = "ok";
    const outcome = await evaluateOrganization(orgId, deps);
    expect(outcome).toMatchObject({ status: "good", transitioned: true });
    expect((await getReputationStanding(orgId))?.reason).toBeNull();
    expect((await listReputationEvents(orgId)).map((event) => event.type)).toEqual([
      "warning_cleared",
      "warning_raised",
    ]);
  });

  test("is not run for organizations that are not due", async () => {
    const tenant = await createTestTenant();
    const { state, deps } = controlledCheck("suspend");
    await markReputationDue(db, tenant.organization.id, new Date(Date.now() + 60_000));
    expect(await runDueReputationEvaluations({ scope: scopeOf(tenant) }, deps)).toBe(0);
    expect(state.contexts).toHaveLength(0);
  });

  test("concurrent workers evaluate an organization once", async () => {
    const tenant = await createTestTenant();
    const { state, deps } = controlledCheck("suspend");
    const now = new Date();
    await markReputationDue(db, tenant.organization.id, now);

    const counts = await Promise.all([
      runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps),
      runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps),
    ]);
    expect(counts[0] + counts[1]).toBe(1);
    expect(state.contexts).toHaveLength(1);
    expect(await listReputationEvents(tenant.organization.id)).toHaveLength(1);
  });

  test("an organization marked due during its evaluation stays due", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const now = new Date();
    const bounceAt = new Date(now.getTime() + 1000);
    const inner = controlledCheck("ok").check;
    const deps = {
      checks: [
        {
          trigger: "bounce_rate",
          async evaluate(context: CheckContext): Promise<CheckResult> {
            // A new bounce arrives while the guard is measuring.
            await markReputationDue(db, orgId, bounceAt);
            return inner.evaluate(context);
          },
        },
      ],
    };
    await markReputationDue(db, orgId, now);
    expect(await runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps)).toBe(1);
    expect((await getReputationStanding(orgId))?.nextEvaluationAt).toEqual(bounceAt);
  });
});

describe("admin operations", () => {
  test("suspending twice is a no-op, and only suspended organizations can be reinstated", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const admin = { kind: "admin" as const, userId: tenant.owner.id };

    await expect(
      reinstateOrganization({ organizationId: orgId, adminUserId: tenant.owner.id, note: "x" }),
    ).rejects.toBeInstanceOf(ReputationError);
    expect(
      await suspendOrganization({
        organizationId: orgId,
        trigger: "manual",
        actor: admin,
        note: "abuse",
      }),
    ).toMatchObject({ type: "suspended", actor: "admin", note: "abuse", trigger: "manual" });
    expect(
      await suspendOrganization({ organizationId: orgId, trigger: "manual", actor: admin }),
    ).toBeNull();
    expect(await getReputationStanding(orgId)).toMatchObject({
      status: "suspended",
      reason: "manual",
    });
  });

  test("reinstating restarts the measurement window, and the guard can't undo it", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const { state, deps } = controlledCheck("suspend");
    const start = new Date(Date.now() - 60_000);
    await evaluateOrganization(orgId, deps, { now: start });
    expect(await isSuspended(orgId)).toBe(true);
    // Recovered rates never lift a suspension on their own.
    state.severity = "ok";
    await evaluateOrganization(orgId, deps, { now: start });
    expect(await isSuspended(orgId)).toBe(true);

    const reinstatedAt = new Date();
    const event = await reinstateOrganization({
      organizationId: orgId,
      adminUserId: tenant.owner.id,
      note: "Customer cleaned their list.",
      now: reinstatedAt,
    });
    expect(event).toMatchObject({
      type: "reinstated",
      actor: "admin",
      actorUserId: tenant.owner.id,
    });
    expect(await getReputationStanding(orgId)).toMatchObject({
      status: "good",
      reason: null,
      reinstatedAt,
    });

    const evaluatedAt = new Date(reinstatedAt.getTime() + 1000);
    await evaluateOrganization(orgId, deps, { now: evaluatedAt });
    expect(state.contexts.at(-1)?.windowStart).toEqual(reinstatedAt);
    const [latest] = await listReputationEvents(orgId);
    expect(latest).toMatchObject({ type: "reinstated", actorEmail: tenant.owner.email });
  });

  test("policy overrides are validated, recorded, and reach the checks", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const update = (overrides: unknown) =>
      updateReputationPolicy({
        organizationId: orgId,
        overrides: overrides as never,
        adminUserId: tenant.owner.id,
      });

    await expect(update({ bounceRate: { warning: 0.5, suspend: 0.1 } })).rejects.toMatchObject({
      code: "invalid_policy",
    });
    await update({ windowDays: 2, bounceRate: { suspend: 0.5 } });
    const standing = await getReputationStanding(orgId);
    expect(standing?.policyOverrides).toEqual({ windowDays: 2, bounceRate: { suspend: 0.5 } });
    expect(standing?.nextEvaluationAt).not.toBeNull();
    expect((await listReputationEvents(orgId))[0]).toMatchObject({ type: "policy_updated" });

    const { state, deps } = controlledCheck("ok");
    const now = new Date();
    await evaluateOrganization(orgId, deps, { now });
    expect(state.contexts[0]?.policy.bounceRate.suspend).toBe(0.5);
    expect(state.contexts[0]?.windowStart).toEqual(new Date(now.getTime() - 2 * 86_400_000));

    await update(null);
    expect((await getReputationStanding(orgId))?.policyOverrides).toBeNull();
  });
});

describe("evaluation races", () => {
  test("new evidence cannot release an active lease or lose warning recovery", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const now = new Date();
    const later = new Date(now.getTime() + 1000);
    const warning = controlledCheck("warning");
    await markReputationDue(db, orgId, now);
    const deps = {
      checks: [
        {
          trigger: "bounce_rate",
          async evaluate(context: CheckContext) {
            await markReputationDue(db, orgId, later);
            expect(
              await runDueReputationEvaluations(
                { now: later, scope: scopeOf(tenant) },
                controlledCheck("ok").deps,
              ),
            ).toBe(0);
            return warning.check.evaluate(context);
          },
        },
      ],
    };
    expect(await runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps)).toBe(1);
    expect(await getReputationStanding(orgId)).toMatchObject({
      status: "warning",
      nextEvaluationAt: later,
      evaluationLeaseUntil: null,
    });
    await runDueReputationEvaluations({ now: later, scope: scopeOf(tenant) }, warning.deps);
    expect((await getReputationStanding(orgId))?.nextEvaluationAt).toEqual(
      new Date(later.getTime() + WARNING_RECHECK_MS),
    );
  });

  test("suspend and reinstate during a check invalidates the old good-state result", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    const reinstatedAt = new Date();
    let calls = 0;
    const deps = {
      checks: [
        {
          trigger: "bounce_rate",
          async evaluate(context: CheckContext) {
            if (calls++ === 0) {
              await suspendOrganization({
                organizationId: orgId,
                trigger: "manual",
                actor: { kind: "admin", userId: tenant.owner.id },
                now: reinstatedAt,
              });
              await reinstateOrganization({
                organizationId: orgId,
                adminUserId: tenant.owner.id,
                note: "Reset",
                now: reinstatedAt,
              });
              return controlledCheck("suspend").check.evaluate(context);
            }
            expect(context.windowStart).toEqual(reinstatedAt);
            return controlledCheck("ok").check.evaluate(context);
          },
        },
      ],
    };
    expect(await evaluateOrganization(orgId, deps)).toMatchObject({
      status: "good",
      transitioned: false,
    });
    expect(calls).toBe(2);
    expect((await listReputationEvents(orgId)).map((event) => event.type)).toEqual([
      "reinstated",
      "suspended",
    ]);
  });

  test("policy changes invalidate measured results even when the status stays good", async () => {
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    let calls = 0;
    const deps = {
      checks: [
        {
          trigger: "bounce_rate",
          async evaluate(context: CheckContext) {
            if (calls++ === 0) {
              await updateReputationPolicy({
                organizationId: orgId,
                adminUserId: tenant.owner.id,
                overrides: { bounceRate: { suspend: 0.5 } },
              });
              return controlledCheck("suspend").check.evaluate(context);
            }
            expect(context.policy.bounceRate.suspend).toBe(0.5);
            return controlledCheck("ok").check.evaluate(context);
          },
        },
      ],
    };
    expect(await evaluateOrganization(orgId, deps)).toMatchObject({
      status: "good",
      transitioned: false,
    });
    expect(calls).toBe(2);
    expect((await listReputationEvents(orgId)).map((event) => event.type)).toEqual([
      "policy_updated",
    ]);
  });

  test("unhealthy rates below minimum volume stay scheduled until volume crosses the minimum", async () => {
    const { rateResult } = await import("../src/checks.ts");
    const tenant = await createTestTenant();
    const orgId = tenant.organization.id;
    let volume = 199;
    const deps = {
      checks: [
        {
          trigger: "bounce_rate",
          async evaluate(context: CheckContext) {
            return rateResult({
              trigger: "bounce_rate",
              label: "Bounces",
              count: 20,
              volume,
              threshold: context.policy.bounceRate,
            });
          },
        },
      ],
    };
    const now = new Date();
    await markReputationDue(db, orgId, now);
    await runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps);
    const later = new Date(now.getTime() + WARNING_RECHECK_MS);
    expect(await getReputationStanding(orgId)).toMatchObject({
      status: "good",
      nextEvaluationAt: later,
    });
    volume++;
    expect(await runDueReputationEvaluations({ now: later, scope: scopeOf(tenant) }, deps)).toBe(1);
    expect(await isSuspended(orgId)).toBe(true);
  });
});

test("an expired worker cannot overwrite the replacement worker's result", async () => {
  const { EVALUATION_LEASE_MS } = await import("../src/evaluate.ts");
  const tenant = await createTestTenant();
  const orgId = tenant.organization.id;
  const now = new Date();
  const later = new Date(now.getTime() + EVALUATION_LEASE_MS);
  await markReputationDue(db, orgId, now);
  const deps = {
    checks: [
      {
        trigger: "bounce_rate",
        async evaluate(context: CheckContext) {
          expect(
            await runDueReputationEvaluations(
              { now: later, scope: scopeOf(tenant) },
              controlledCheck("warning").deps,
            ),
          ).toBe(1);
          return controlledCheck("ok").check.evaluate(context);
        },
      },
    ],
  };
  expect(await runDueReputationEvaluations({ now, scope: scopeOf(tenant) }, deps)).toBe(0);
  expect(await getReputationStanding(orgId)).toMatchObject({
    status: "warning",
    nextEvaluationAt: new Date(later.getTime() + WARNING_RECHECK_MS),
    lastEvaluatedAt: later,
  });
});

test("administrative reputation changes also appear in the platform audit log", async () => {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  await suspendOrganization({
    organizationId,
    trigger: "manual",
    actor: { kind: "admin", userId: tenant.owner.id },
    note: "Investigate",
  });
  await reinstateOrganization({ organizationId, adminUserId: tenant.owner.id, note: "Resolved" });
  await updateReputationPolicy({ organizationId, adminUserId: tenant.owner.id, overrides: null });
  const events = await db
    .select()
    .from(schema.adminAuditEvent)
    .where(eq(schema.adminAuditEvent.organizationId, organizationId))
    .orderBy(asc(schema.adminAuditEvent.id));
  expect(events.map((event) => [event.action, event.actorEmail, event.reason])).toEqual([
    ["reputation.suspended", tenant.owner.email, "Investigate"],
    ["reputation.reinstated", tenant.owner.email, "Resolved"],
    ["reputation.policy_updated", tenant.owner.email, null],
  ]);
});

test("failed claims are retried after expiry without a new due marker", async () => {
  const { EVALUATION_LEASE_MS } = await import("../src/evaluate.ts");
  const tenant = await createTestTenant();
  const orgId = tenant.organization.id;
  const now = new Date();
  await markReputationDue(db, orgId, now);
  expect(
    await runDueReputationEvaluations(
      { now, scope: scopeOf(tenant) },
      {
        checks: [
          {
            trigger: "failure",
            async evaluate() {
              throw new Error("test failure");
            },
          },
        ],
      },
    ),
  ).toBe(0);
  expect((await getReputationStanding(orgId))?.nextEvaluationAt).toBeNull();
  expect(
    await runDueReputationEvaluations(
      { now, scope: scopeOf(tenant) },
      controlledCheck("warning").deps,
    ),
  ).toBe(0);
  expect(
    await runDueReputationEvaluations(
      { now: new Date(now.getTime() + EVALUATION_LEASE_MS), scope: scopeOf(tenant) },
      controlledCheck("warning").deps,
    ),
  ).toBe(1);
  expect((await getReputationStanding(orgId))?.status).toBe("warning");
});
