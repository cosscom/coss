import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import {
  type CheckContext,
  DEFAULT_REPUTATION_POLICY,
  getReputationStanding,
  listReputationEvents,
  reinstateOrganization,
  updateReputationPolicy,
} from "@coss/reputation";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { contentScreeningCheck } from "../src/check.ts";
import type { ScreeningContent } from "../src/classifier.ts";
import { fakeClassifier } from "../src/fake.ts";
import { listScreenings } from "../src/read.ts";
import { CONTENT_SCREENING_TRIGGER, type ScreenInput, screenMessage } from "../src/screen.ts";

const content = (subject = "Your receipt"): ScreeningContent => ({
  kind: "email",
  from: "billing@example.com",
  subject,
  text: "Thanks for your order.",
  links: [],
});

function input(tenant: TestTenant, subject?: string): ScreenInput {
  return {
    organizationId: tenant.organization.id,
    environmentId: tenant.production.id,
    product: "email",
    subjectId: newId("email"),
    content: () => content(subject),
  };
}

const never = () => 1;

async function counter(organizationId: string) {
  const [row] = await db
    .select()
    .from(schema.contentScreeningCounter)
    .where(
      and(
        eq(schema.contentScreeningCounter.organizationId, organizationId),
        eq(schema.contentScreeningCounter.product, "email"),
      ),
    );
  return row;
}

describe("screenMessage", () => {
  test("screens the first messages, then only milestones and the random sample", async () => {
    const tenant = await createTestTenant();
    const classifier = fakeClassifier();
    for (let i = 0; i < 12; i++) {
      await screenMessage(input(tenant), { classifier, random: never });
    }
    expect(classifier.calls).toHaveLength(DEFAULT_REPUTATION_POLICY.contentScreening.alwaysFirst);
    expect((await counter(tenant.organization.id))?.seen).toBe(12);

    // The 13th message is sampled at random.
    await screenMessage(input(tenant), { classifier, random: () => 0 });
    expect(classifier.calls).toHaveLength(11);
    const [latest] = await listScreenings(tenant.organization.id, { limit: 1 });
    expect(latest).toMatchObject({ sequence: 13, verdict: "clean", classifier: "fake" });
  });

  test("records a clean verdict and sends", async () => {
    const tenant = await createTestTenant();
    const outcome = await screenMessage(input(tenant), { classifier: fakeClassifier() });
    expect(outcome.action).toBe("send");
    expect(outcome.screening).toMatchObject({
      verdict: "clean",
      enforced: true,
      sequence: 1,
      topScore: expect.closeTo(0.01, 5),
      product: "email",
    });
    expect((await getReputationStanding(tenant.organization.id))?.status ?? "good").toBe("good");
  });

  test("flags without blocking and asks the guard to evaluate", async () => {
    const tenant = await createTestTenant();
    const outcome = await screenMessage(input(tenant, "Hot deals [coss-test:spam:0.8]"), {
      classifier: fakeClassifier(),
    });
    expect(outcome.action).toBe("send");
    expect(outcome.screening).toMatchObject({ verdict: "flagged", topCategory: "spam" });
    const standing = await getReputationStanding(tenant.organization.id);
    expect(standing?.status).toBe("good");
    expect(standing?.nextEvaluationAt).not.toBeNull();
  });

  test("blocks and suspends on a confident verdict", async () => {
    const tenant = await createTestTenant();
    const subject = input(tenant, "Verify your account [coss-test:phishing]");
    const outcome = await screenMessage(subject, { classifier: fakeClassifier() });
    expect(outcome.action).toBe("block");
    expect(outcome.screening).toMatchObject({
      verdict: "blocked",
      topCategory: "phishing",
      subjectId: subject.subjectId,
    });
    const standing = await getReputationStanding(tenant.organization.id);
    expect(standing).toMatchObject({ status: "suspended", reason: CONTENT_SCREENING_TRIGGER });
    const [event] = await listReputationEvents(tenant.organization.id);
    expect(event).toMatchObject({ type: "suspended", actor: "system" });
    expect(event?.note).toContain(subject.subjectId);
  });

  test("never blocks or suspends COSS's own organization: a block only flags", async () => {
    const tenant = await createTestTenant();
    const outcome = await screenMessage(input(tenant, "Reset your password [coss-test:phishing]"), {
      classifier: fakeClassifier(),
      systemOrganizationId: tenant.organization.id,
    });
    expect(outcome.action).toBe("send");
    expect(outcome.screening).toMatchObject({ verdict: "flagged", topCategory: "phishing" });
    const standing = await getReputationStanding(tenant.organization.id);
    expect(standing?.status).toBe("good");
    expect(standing?.nextEvaluationAt).not.toBeNull();
  });

  test("does not block COSS's own organization when its classifier fails", async () => {
    const tenant = await createTestTenant();
    const outcome = await screenMessage(input(tenant), {
      classifier: fakeClassifier({ fail: true }),
      systemOrganizationId: tenant.organization.id,
    });
    expect(outcome).toMatchObject({
      action: "send",
      screening: { verdict: "error", enforced: true },
    });
  });

  test("fails closed in enforcement mode on classifier errors; the held message is retried", async () => {
    const tenant = await createTestTenant();
    await updateReputationPolicy({
      organizationId: tenant.organization.id,
      adminUserId: tenant.owner.id,
      overrides: { contentScreening: { alwaysFirst: 1, milestones: [] } },
    });
    const failing = fakeClassifier({ fail: true });
    const held = input(tenant);
    const failed = await screenMessage(held, { classifier: failing, random: never });
    expect(failed.action).toBe("block");
    expect(failed.screening).toMatchObject({ verdict: "error", enforced: true, sequence: 1 });
    expect(failed.screening?.errorMessage).toContain("fake classifier failure");
    // The product holds the message and retries it, so no sample passes to the next message:
    // during an outage, unsampled messages keep going out instead of each hitting the classifier.
    expect((await counter(tenant.organization.id))?.owed).toBe(false);
    const classifier = fakeClassifier();
    expect(await screenMessage(input(tenant), { classifier, random: never })).toMatchObject({
      action: "send",
      screening: null,
    });
    expect(classifier.calls).toHaveLength(0);

    // The retry is screened (it was a sample) at its old position, without being counted again.
    const retried = await screenMessage({ ...held, retry: true }, { classifier, random: never });
    expect(retried).toMatchObject({ action: "send", screening: { verdict: "clean", sequence: 1 } });
    expect(classifier.calls).toHaveLength(1);
    expect((await counter(tenant.organization.id))?.seen).toBe(2);
  });

  test("shadow mode owes a failed sample to the next message once, never a chain", async () => {
    const tenant = await createTestTenant();
    await updateReputationPolicy({
      organizationId: tenant.organization.id,
      adminUserId: tenant.owner.id,
      overrides: { contentScreening: { enforce: false, alwaysFirst: 1, milestones: [] } },
    });
    const failing = fakeClassifier({ fail: true });
    const first = await screenMessage(input(tenant), { classifier: failing, random: never });
    expect(first).toMatchObject({ action: "send", screening: { verdict: "error" } });
    expect((await counter(tenant.organization.id))?.owed).toBe(true);
    // Message 2 takes the owed sample; failing again, it doesn't pass it on.
    const second = await screenMessage(input(tenant), { classifier: failing, random: never });
    expect(second).toMatchObject({ action: "send", screening: { verdict: "error", sequence: 2 } });
    expect((await counter(tenant.organization.id))?.owed).toBe(false);
    const third = await screenMessage(input(tenant), { classifier: failing, random: never });
    expect(third).toMatchObject({ action: "send", screening: null });
    expect(failing.calls).toHaveLength(2);
  });

  test("times out slow classifiers", async () => {
    const tenant = await createTestTenant();
    const outcome = await screenMessage(input(tenant), {
      classifier: fakeClassifier({ delayMs: 1000 }),
      timeoutMs: 20,
    });
    expect(outcome).toMatchObject({ action: "block", screening: { verdict: "error" } });
  });

  test("shadow mode records verdicts without acting on them", async () => {
    const tenant = await createTestTenant();
    await updateReputationPolicy({
      organizationId: tenant.organization.id,
      adminUserId: tenant.owner.id,
      overrides: { contentScreening: { enforce: false } },
    });
    const outcome = await screenMessage(input(tenant, "[coss-test:fraud]"), {
      classifier: fakeClassifier(),
    });
    expect(outcome.action).toBe("send");
    expect(outcome.screening).toMatchObject({ verdict: "blocked", enforced: false });
    expect((await getReputationStanding(tenant.organization.id))?.status).toBe("good");
  });

  test("screens nothing when disabled for the organization", async () => {
    const tenant = await createTestTenant();
    await updateReputationPolicy({
      organizationId: tenant.organization.id,
      adminUserId: tenant.owner.id,
      overrides: { contentScreening: { enabled: false } },
    });
    const classifier = fakeClassifier();
    const outcome = await screenMessage(input(tenant, "[coss-test:phishing]"), { classifier });
    expect(outcome).toEqual({ action: "send", screening: null });
    expect(classifier.calls).toHaveLength(0);
    expect(await counter(tenant.organization.id)).toBeUndefined();
  });

  test("concurrent messages get distinct positions", async () => {
    const tenant = await createTestTenant();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        screenMessage(input(tenant), { classifier: fakeClassifier() }),
      ),
    );
    const sequences = results
      .map((result) => result.screening?.sequence ?? 0)
      .sort((a, b) => a - b);
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("contentScreeningCheck", () => {
  function context(tenant: TestTenant, windowStart = new Date(Date.now() - 86_400_000)) {
    return {
      organizationId: tenant.organization.id,
      now: new Date(Date.now() + 1000),
      windowStart,
      policy: DEFAULT_REPUTATION_POLICY,
    } satisfies CheckContext;
  }

  test("ok, then warning on a flag, then suspend on a block", async () => {
    const tenant = await createTestTenant();
    const classifier = fakeClassifier();
    await screenMessage(input(tenant), { classifier });
    expect(await contentScreeningCheck.evaluate(context(tenant))).toMatchObject({
      trigger: CONTENT_SCREENING_TRIGGER,
      severity: "ok",
      count: 0,
      volume: 1,
      rate: null,
    });

    await screenMessage(input(tenant, "[coss-test:spam:0.75]"), { classifier });
    expect(await contentScreeningCheck.evaluate(context(tenant))).toMatchObject({
      severity: "warning",
      count: 1,
      volume: 2,
    });

    await screenMessage(input(tenant, "[coss-test:malware]"), { classifier });
    expect(await contentScreeningCheck.evaluate(context(tenant))).toMatchObject({
      severity: "suspend",
      count: 2,
      volume: 3,
    });
  });

  test("ignores verdicts before the window (e.g. a reinstatement) and unenforced ones", async () => {
    const tenant = await createTestTenant();
    await screenMessage(input(tenant, "[coss-test:phishing]"), { classifier: fakeClassifier() });
    await reinstateOrganization({
      organizationId: tenant.organization.id,
      adminUserId: tenant.owner.id,
      note: "Reviewed: a security awareness test.",
    });
    const standing = await getReputationStanding(tenant.organization.id);
    const afterReinstatement = context(tenant, standing?.reinstatedAt ?? new Date());
    expect((await contentScreeningCheck.evaluate(afterReinstatement)).severity).toBe("ok");

    await updateReputationPolicy({
      organizationId: tenant.organization.id,
      adminUserId: tenant.owner.id,
      overrides: { contentScreening: { enforce: false } },
    });
    await screenMessage(input(tenant, "[coss-test:phishing]"), { classifier: fakeClassifier() });
    expect((await contentScreeningCheck.evaluate(afterReinstatement)).severity).toBe("ok");
  });
});
