import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { purgeExpiredScreenings } from "../src/retention.ts";

const { contentScreening } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;

describe("purgeExpiredScreenings", () => {
  test("deletes verdicts older than the cutoff", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const verdict = (days: number, sequence: number) => ({
      organizationId,
      environmentId: tenant.production.id,
      product: "email",
      subjectId: newId("email"),
      sequence,
      classifier: "fake",
      verdict: "clean" as const,
      latencyMs: 5,
      createdAt: new Date(Date.now() - days * DAY_MS),
    });
    const [, recent] = await db
      .insert(contentScreening)
      .values([
        verdict(RETENTION_DAYS.contentScreenings + 1, 1),
        verdict(RETENTION_DAYS.contentScreenings - 1, 2),
      ])
      .returning({ id: contentScreening.id });

    expect(await purgeExpiredScreenings({ scope: { organizationIds: [organizationId] } })).toBe(1);
    const left = await db
      .select({ id: contentScreening.id })
      .from(contentScreening)
      .where(eq(contentScreening.organizationId, organizationId));
    expect(left).toEqual([{ id: recent?.id as string }]);
  });
});
