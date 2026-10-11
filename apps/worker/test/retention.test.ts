import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { FakeEmailProvider } from "@coss/email";
import { SendEmailRequest } from "@coss/email/schemas";
import { dispatchingEmailService } from "@coss/email/testing";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq, sql } from "drizzle-orm";
import { runRetention } from "../src/retention.ts";

async function tenantWithOldEmails(count: number) {
  const tenant = await createTestTenant();
  const provider = new FakeEmailProvider({ log: false });
  const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
  const environment = tenant.development;
  for (let i = 0; i < count; i++) {
    await service.send({
      environment: {
        organizationId: environment.organizationId,
        projectId: environment.projectId,
        environmentId: environment.id,
        mode: environment.mode,
      },
      apiKeyId: null,
      params: SendEmailRequest.parse({
        from: "Acme <hello@acme.com>",
        to: "user@example.com",
        subject: "Hi",
        text: "Hi",
      }),
    });
  }
  await db
    .update(schema.email)
    .set({ createdAt: sql`now() - make_interval(days => ${RETENTION_DAYS.emails + 1})` })
    .where(eq(schema.email.organizationId, tenant.organization.id));
  const remaining = async () =>
    (
      await db
        .select({ id: schema.email.id })
        .from(schema.email)
        .where(eq(schema.email.organizationId, tenant.organization.id))
    ).length;
  return { scope: { organizationIds: [tenant.organization.id] }, remaining };
}

describe("runRetention", () => {
  test("reports a full batch until it has caught up", async () => {
    const { scope, remaining } = await tenantWithOldEmails(3);
    expect(await runRetention({ limit: 2, scope })).toBe(true);
    expect(await remaining()).toBe(1);
    expect(await runRetention({ limit: 2, scope })).toBe(false);
    expect(await remaining()).toBe(0);
  });

  test("does nothing once shutdown has begun", async () => {
    const { scope, remaining } = await tenantWithOldEmails(1);
    expect(await runRetention({ limit: 10, scope, signal: AbortSignal.abort() })).toBe(false);
    expect(await remaining()).toBe(1);
  });
});
