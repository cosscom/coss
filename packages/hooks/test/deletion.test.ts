import { expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { requestOrganizationDeletion } from "@coss/tenancy";
import { runDueOrganizationDeletions } from "@coss/tenancy/deletion";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { createHookApplication } from "../src/applications.ts";
import { runDueHookDeliveries } from "../src/deliver.ts";
import { createHookEndpoint } from "../src/endpoints.ts";
import { sendHookMessage } from "../src/messages.ts";
import { createHookPortalSession } from "../src/portal.ts";
import { testHookDeliveryDeps, testHookDeps } from "../src/testing.ts";

test("deleting the organization revokes portal sessions, then deletes every Hooks row", async () => {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const application = await createHookApplication({
    organizationId,
    environmentId: tenant.development.id,
    name: "Acme",
  });
  await createHookEndpoint(
    {
      organizationId,
      environmentId: tenant.development.id,
      applicationId: application.id,
      url: "https://example.com/hook",
    },
    testHookDeps,
  );
  for (let i = 0; i < 3; i++) {
    await sendHookMessage({ application, eventType: "invoice.paid", payload: { i } });
  }
  await runDueHookDeliveries(
    { scope: { organizationIds: [organizationId] } },
    testHookDeliveryDeps({ send: async () => ({ status: 200, body: "" }) }),
  );
  await createHookPortalSession({ application });
  const count = async (table: typeof schema.hookMessage | typeof schema.hookAttempt) =>
    (await db.select().from(table).where(eq(table.organizationId, organizationId))).length;
  expect(await count(schema.hookMessage)).toBe(3);
  expect(await count(schema.hookAttempt)).toBe(3);

  await requestOrganizationDeletion({
    organizationId,
    actor: { userId: tenant.owner.id, email: tenant.owner.email },
  });
  const sessions = await db
    .select()
    .from(schema.hookPortalSession)
    .where(eq(schema.hookPortalSession.organizationId, organizationId));
  expect(sessions).toEqual([]);

  await runDueOrganizationDeletions(
    { scope: { organizationIds: [organizationId] }, batchSize: 2 },
    { releaseProviderResources: async () => {} },
  );
  for (const table of [
    schema.hookMessage,
    schema.hookDelivery,
    schema.hookAttempt,
    schema.hookEndpoint,
    schema.hookApplication,
  ]) {
    const rows = await db.select().from(table).where(eq(table.organizationId, organizationId));
    expect(rows).toEqual([]);
  }
});
