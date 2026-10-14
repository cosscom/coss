import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { appendLogEntries } from "@coss/logs";
import { eq } from "drizzle-orm";
import { forgetRiskUser, recordRiskFeedback } from "../src/feedback.ts";
import { getRiskAssessment, listRiskAssessments } from "../src/read.ts";
import { TEST_IPS } from "../src/testing.ts";
import { setup } from "./helpers.ts";

describe("forgetRiskUser", () => {
  test("drops the user's identities, reports and personal data, and mentions of them", async () => {
    const { assess, live, deps } = await setup();
    const own = (
      await assess({
        event: "signup",
        user: { id: "u1", email: "ada@acme.io" },
        ip: TEST_IPS.residential,
      })
    ).assessment;
    const other = (await assess({ event: "signup", user: { id: "u2", email: "ada@acme.io" } }))
      .assessment;
    await recordRiskFeedback(
      deps.hash,
      live,
      own.id,
      { outcome: "fraud" },
      { source: "api", actorId: null },
    );
    expect(other.reasons.find((r) => r.code === "duplicate.canonical_mailbox")).toMatchObject({
      previous_user: "u1",
    });

    await db.insert(schema.logDrain).values({
      organizationId: live.organizationId,
      projectId: live.projectId,
      environmentId: live.environmentId,
      url: "https://example.com/logs",
      secretCiphertext: "unused",
      sources: ["risk"],
    });
    // Simulate the log format retained from before user IDs stopped being logged.
    await appendLogEntries(db, [
      {
        ...live,
        occurredAt: new Date(),
        source: "risk",
        level: "info",
        type: "risk.assessment",
        message: "login assessed",
        resourceId: own.id,
        attributes: { user_id: "u1", decision: "allow" },
        searchTerms: ["u1"],
      },
    ]);
    expect(await forgetRiskUser(deps.hash, live, "u1")).toBe(1);

    const logs = await db
      .select()
      .from(schema.logEntry)
      .where(eq(schema.logEntry.environmentId, live.environmentId));
    expect(
      logs.some((log) => log.attributes.user_id === "u1" || log.searchText.includes("u1")),
    ).toBe(false);
    const drainRecords = await db
      .select()
      .from(schema.logDrainRecord)
      .where(eq(schema.logDrainRecord.organizationId, live.organizationId));
    expect(drainRecords).toHaveLength(1);
    expect(JSON.stringify(drainRecords[0]?.line)).not.toContain("u1");

    const forgotten = await getRiskAssessment(live, own.id);
    expect(forgotten).toMatchObject({
      user: { id: null, email: null },
      ip: null,
      outcome: "fraud",
    });
    expect(forgotten?.signals.email?.domain).toBeNull();
    const mention = await getRiskAssessment(live, other.id);
    expect(mention?.reasons.find((r) => r.code === "duplicate.canonical_mailbox")).toMatchObject({
      previous_user: null,
      message: "This mailbox was already used to sign up.",
    });
    const reports = await db
      .select()
      .from(schema.riskReport)
      .where(eq(schema.riskReport.environmentId, live.environmentId));
    expect(reports).toEqual([]);
    expect((await listRiskAssessments(live, { user_id: "u1" })).data).toEqual([]);

    // The mailbox is free again for u3 except for u2's own identity.
    const next = (await assess({ event: "signup", user: { id: "u3", email: "ada@acme.io" } }))
      .assessment;
    expect(next.reasons.find((r) => r.code === "duplicate.canonical_mailbox")).toMatchObject({
      previous_user: "u2",
    });
    // Forgetting is idempotent.
    expect(await forgetRiskUser(deps.hash, live, "u1")).toBe(0);
  });
});

describe("listRiskAssessments", () => {
  test("filters and pages, newest first; the review queue", async () => {
    const { assess, live, sandbox } = await setup();
    const a = (await assess({ event: "login", user: { id: "u1" } })).assessment;
    const b = (await assess({ event: "signup", user: { email: "x@mailinator.com" } })).assessment;
    const c = (await assess({ event: "login", user: { id: "u1" } })).assessment;
    const page = await listRiskAssessments(live, { limit: 2 });
    expect(page.data.map((x) => x.id)).toEqual([c.id, b.id]);
    expect(page.has_more).toBe(true);
    expect(
      (await listRiskAssessments(live, { limit: 2, after: b.id })).data.map((x) => x.id),
    ).toEqual([a.id]);
    expect(
      (await listRiskAssessments(live, { review_status: "open" })).data.map((x) => x.id),
    ).toEqual([b.id]);
    expect((await listRiskAssessments(live, { event: "login", user_id: "u1" })).data).toHaveLength(
      2,
    );
    expect((await listRiskAssessments(live, { decision: "block" })).data).toEqual([]);
    expect((await listRiskAssessments(sandbox)).data).toEqual([]);
    expect((await listRiskAssessments(live, { after: "nope" })).data).toEqual([]);
    expect(await getRiskAssessment(sandbox, a.id)).toBeNull();
  });
});

test("correcting one assessment preserves independent fraud evidence", async () => {
  const { assess, deps, live } = await setup();
  const params = {
    event: "login" as const,
    user: { id: "same", email: "same@acme.io" },
    ip: TEST_IPS.residential,
  };
  const a = (await assess(params)).assessment;
  const b = (await assess(params)).assessment;
  const feedback = (id: string, outcome: "fraud" | "legitimate") =>
    recordRiskFeedback(deps.hash, live, id, { outcome }, { source: "api", actorId: null });
  await Promise.all([feedback(a.id, "fraud"), feedback(b.id, "fraud")]);
  await feedback(b.id, "legitimate");
  const codes = (await assess(params)).assessment.reasons.map((r) => r.code);
  expect(codes).toContain("history.fraud_user");
  expect(codes).toContain("history.fraud_mailbox");
  expect(codes).toContain("history.fraud_ip");
  await feedback(a.id, "legitimate");
  expect(
    (await assess(params)).assessment.reasons.some((r) => r.code.startsWith("history.fraud")),
  ).toBe(false);
});
