import { expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq, inArray } from "drizzle-orm";
import { purgeExpiredFormFakeObjects, purgeExpiredFormSubmissions } from "../src/index.ts";

const DAY = 24 * 60 * 60 * 1000;

test("accepted submissions are kept longer than spam; files go to the store's cleanup", async () => {
  const tenant = await createTestTenant();
  const scope = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
  };
  const [form] = await db
    .insert(schema.form)
    .values({ ...scope, name: "Retention" })
    .returning();
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const rows = await db
    .insert(schema.formSubmission)
    .values([
      { ...scope, formId: form?.id ?? "", status: "accepted", data: {}, createdAt: ago(20) },
      { ...scope, formId: form?.id ?? "", status: "spam", data: {}, createdAt: ago(20) },
      {
        ...scope,
        formId: form?.id ?? "",
        status: "accepted",
        data: {},
        createdAt: ago(RETENTION_DAYS.formSubmissions + 1),
      },
    ])
    .returning();
  const [recentAccepted, oldSpam, oldAccepted] = rows;
  const key = `orgs/${scope.organizationId}/spam-file`;
  await db.insert(schema.formSubmissionFile).values({
    organizationId: scope.organizationId,
    submissionId: oldSpam?.id ?? "",
    field: "file",
    filename: "a.txt",
    contentType: "text/plain",
    size: 1,
    storeKey: key,
    sha256: "0",
  });

  const deleted = await purgeExpiredFormSubmissions({
    now,
    scope: { organizationIds: [scope.organizationId] },
  });
  expect(deleted).toBe(2);
  const left = await db
    .select({ id: schema.formSubmission.id })
    .from(schema.formSubmission)
    .where(
      inArray(
        schema.formSubmission.id,
        rows.map((row) => row.id),
      ),
    );
  expect(left.map((row) => row.id)).toEqual([recentAccepted?.id ?? ""]);
  expect(oldAccepted).toBeDefined();
  const cleanup = await db
    .select({ key: schema.formStoreCleanup.key })
    .from(schema.formStoreCleanup)
    .where(eq(schema.formStoreCleanup.organizationId, scope.organizationId));
  expect(cleanup).toEqual([{ key }]);
});

test("the fake store's objects expire after the longest retention", async () => {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const now = new Date();
  await db.insert(schema.formFakeObject).values([
    {
      key: `orgs/${organizationId}/old`,
      organizationId,
      contentType: "text/plain",
      content: Buffer.from("x"),
      createdAt: new Date(now.getTime() - (RETENTION_DAYS.formSubmissions + 2) * DAY),
    },
    {
      key: `orgs/${organizationId}/new`,
      organizationId,
      contentType: "text/plain",
      content: Buffer.from("x"),
    },
  ]);
  expect(
    await purgeExpiredFormFakeObjects({ now, scope: { organizationIds: [organizationId] } }),
  ).toBe(1);
});
