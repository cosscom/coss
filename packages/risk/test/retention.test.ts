import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { recordRiskFeedback } from "../src/feedback.ts";
import { getRiskAssessment } from "../src/read.ts";
import {
  purgeExpiredRiskAssessments,
  purgeExpiredRiskMemory,
  purgeExpiredRiskPersonalData,
} from "../src/retention.ts";
import { TEST_IPS } from "../src/testing.ts";
import { setup } from "./helpers.ts";

const DAY = 24 * 60 * 60 * 1000;

describe("risk retention", () => {
  test("personal data after 90 days, network reports after 30, the rest after a year", async () => {
    const { assess, live, deps, organizationId } = await setup();
    const scope = { organizationIds: [organizationId] };
    const { assessment } = await assess({
      event: "signup",
      user: { id: "u1", email: "ada@acme.io" },
      ip: TEST_IPS.residential,
      user_agent: "Mozilla/5.0",
    });
    await recordRiskFeedback(
      deps.hash,
      live,
      assessment.id,
      { outcome: "fraud" },
      {
        source: "api",
        actorId: null,
      },
    );

    const at = (days: number) => new Date(Date.now() + days * DAY);
    expect(await purgeExpiredRiskPersonalData({ now: at(89), scope })).toBe(0);
    expect(await purgeExpiredRiskPersonalData({ now: at(91), scope })).toBe(1);
    expect(await purgeExpiredRiskPersonalData({ now: at(91), scope })).toBe(0);
    const purged = await getRiskAssessment(live, assessment.id);
    expect(purged).toMatchObject({ user: { id: "u1", email: null }, ip: null, outcome: "fraud" });
    const [row] = await db
      .select()
      .from(schema.riskAssessment)
      .where(eq(schema.riskAssessment.id, assessment.id));
    expect(row).toMatchObject({ userAgent: null, emailHash: expect.any(String) });

    // ip + subnet reports go after 30 days; mailbox + user reports and the identity after a year.
    // [identities, reports, login networks (country + ASN), domain ages (not scoped)].
    expect(await purgeExpiredRiskMemory({ now: at(31), scope })).toEqual([0, 2, 0, 0]);
    expect(await purgeExpiredRiskMemory({ now: at(366), scope })).toEqual([1, 2, 2, 0]);

    expect(await purgeExpiredRiskAssessments({ now: at(364), scope })).toBe(0);
    expect(await purgeExpiredRiskAssessments({ now: at(366), scope })).toBe(1);
    const feedback = await db
      .select()
      .from(schema.riskFeedback)
      .where(eq(schema.riskFeedback.assessmentId, assessment.id));
    expect(feedback).toEqual([]);
  });
});
