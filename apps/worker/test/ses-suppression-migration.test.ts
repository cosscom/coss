import { expect, test } from "bun:test";
import {
  ListSuppressedDestinationsCommand,
  ListTenantsCommand,
  type SESv2Client,
} from "@aws-sdk/client-sesv2";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { migrateSesSuppressions } from "../scripts/ses-suppression-migration.ts";

async function fixture() {
  const t = await createTestTenant();
  const prefix = `migration-${crypto.randomUUID().slice(0, 8)}`;
  const name = `${prefix}-${t.organization.id}`;
  await db
    .insert(schema.emailTenant)
    .values({ organizationId: t.organization.id, provider: "ses", tenantName: name });
  return { t, name, prefix };
}

function fakeSes(name: string, options: { failImport?: boolean; failDisable?: boolean } = {}) {
  const calls: { kind: string; input: unknown }[] = [];
  const ses = {
    async send(command: { input: Record<string, unknown>; constructor: { name: string } }) {
      calls.push({ kind: command.constructor.name, input: command.input });
      if (command instanceof ListTenantsCommand) {
        return command.input.NextToken
          ? { Tenants: [{ TenantName: name }, { TenantName: "foreign-org" }] }
          : { NextToken: "tenants-page-2" };
      }
      if (command instanceof ListSuppressedDestinationsCommand) {
        if (options.failImport && command.input.TenantName) throw new Error("export failed");
        const address = command.input.TenantName ? "tenant@example.com" : "account@example.com";
        return command.input.NextToken
          ? {
              SuppressedDestinationSummaries: [{ EmailAddress: address, Reason: "COMPLAINT" }],
            }
          : {
              NextToken: "list-page-2",
              SuppressedDestinationSummaries: [
                { EmailAddress: "bounce@simulator.amazonses.com", Reason: "BOUNCE" },
              ],
            };
      }
      if (options.failDisable) throw new Error("AWS update failed");
      return {};
    },
  } as unknown as Pick<SESv2Client, "send">;
  return { ses, calls };
}

async function rows(org: string) {
  return db
    .select()
    .from(schema.emailSuppression)
    .where(eq(schema.emailSuppression.organizationId, org));
}

test("imports paginated SES lists and already-ingested history before disabling, once per tenant", async () => {
  const { t, name, prefix } = await fixture();
  const other = await createTestTenant();
  const [secondLive] = await db
    .insert(schema.environment)
    .values({
      organizationId: t.organization.id,
      projectId: t.project.id,
      name: "Second live",
      slug: "second-live",
      mode: "live",
    })
    .returning();
  if (!secondLive) throw new Error("Missing fixture environment");
  const [manual] = await db
    .insert(schema.emailSuppression)
    .values({
      organizationId: t.organization.id,
      projectId: t.project.id,
      environmentId: secondLive.id,
      address: "account@example.com",
      reason: "manual",
      scope: "*",
    })
    .returning();
  const [mail] = await db
    .insert(schema.email)
    .values({
      organizationId: t.organization.id,
      projectId: t.project.id,
      environmentId: t.production.id,
      from: "sender@example.com",
      to: ["old@example.com"],
      subject: "history",
      provider: "ses",
    })
    .returning();
  if (!mail) throw new Error("Missing fixture email");
  for (const [address, type, bounceType, provider] of [
    ["old@example.com", "email.bounced", "permanent", "ses"],
    ["complaint@example.com", "email.complained", "permanent", "ses"],
    ["soft@example.com", "email.bounced", "transient", "ses"],
    ["fake@example.com", "email.bounced", "permanent", "fake"],
  ] as const) {
    await db.insert(schema.emailEvent).values({
      organizationId: t.organization.id,
      environmentId: t.production.id,
      emailId: mail.id,
      type,
      provider,
      providerEventType: "historical",
      recipient: address,
      occurredAt: new Date(),
      dedupeKey: crypto.randomUUID(),
      details: { bounce: { type: bounceType, sub_type: "General", diagnostic_code: null } },
    });
  }
  const { ses, calls } = fakeSes(name);
  const input = { configurationSet: "test", tenantPrefix: prefix };
  expect(await migrateSesSuppressions(ses, input)).toBe(1);
  const imported = await rows(t.organization.id);
  expect(
    imported
      .filter((r) => r.environmentId === t.production.id)
      .map((r) => r.address)
      .sort(),
  ).toEqual([
    "account@example.com",
    "complaint@example.com",
    "old@example.com",
    "tenant@example.com",
  ]);
  expect(imported.every((r) => r.environmentId !== t.development.id && r.scope === "*")).toBe(true);
  expect(
    imported
      .filter((r) => r.environmentId === secondLive.id)
      .map((r) => r.address)
      .sort(),
  ).toEqual(["account@example.com", "tenant@example.com"]);
  expect(imported.find((r) => r.id === manual?.id)).toEqual(manual);
  expect(imported.find((r) => r.address === "old@example.com")?.emailId).toBe(mail.id);
  expect(await rows(other.organization.id)).toEqual([]);
  expect(calls.slice(-2).map((c) => c.kind)).toEqual([
    "PutTenantSuppressionAttributesCommand",
    "PutConfigurationSetSuppressionOptionsCommand",
  ]);
  await db
    .delete(schema.emailSuppression)
    .where(eq(schema.emailSuppression.organizationId, t.organization.id));
  const retry = fakeSes(name);
  await migrateSesSuppressions(retry.ses, input);
  expect(await rows(t.organization.id)).toEqual([]);
  expect(retry.calls.some((c) => c.kind === "ListSuppressedDestinationsCommand")).toBe(false);
});

test("failed import rolls back history/list entries and leaves AWS protection intact", async () => {
  const { t, name, prefix } = await fixture();
  const { ses, calls } = fakeSes(name, { failImport: true });
  await expect(
    migrateSesSuppressions(ses, { configurationSet: "test", tenantPrefix: prefix }),
  ).rejects.toThrow("export failed");
  expect(await rows(t.organization.id)).toEqual([]);
  const [tenant] = await db
    .select()
    .from(schema.emailTenant)
    .where(eq(schema.emailTenant.organizationId, t.organization.id));
  expect(tenant?.suppressionMigratedAt).toBeNull();
  expect(calls.some((c) => c.kind.startsWith("Put"))).toBe(false);
});

test("AWS update failure leaves committed protection and retries without resurrecting removals", async () => {
  const { t, name, prefix } = await fixture();
  const input = { configurationSet: "test", tenantPrefix: prefix };
  await expect(
    migrateSesSuppressions(fakeSes(name, { failDisable: true }).ses, input),
  ).rejects.toThrow("AWS update failed");
  expect(await rows(t.organization.id)).toHaveLength(2);
  await db
    .delete(schema.emailSuppression)
    .where(
      and(
        eq(schema.emailSuppression.organizationId, t.organization.id),
        eq(schema.emailSuppression.address, "account@example.com"),
      ),
    );
  await migrateSesSuppressions(fakeSes(name).ses, input);
  expect((await rows(t.organization.id)).map((r) => r.address)).toEqual(["tenant@example.com"]);
});

test("an unmapped tenant prevents disabling SES protection", async () => {
  const prefix = `missing-${crypto.randomUUID()}`;
  const { ses, calls } = fakeSes(`${prefix}-org_missing`);
  await expect(
    migrateSesSuppressions(ses, { configurationSet: "test", tenantPrefix: prefix }),
  ).rejects.toThrow("No COSS database mapping");
  expect(calls.some((c) => c.kind.startsWith("Put"))).toBe(false);
});
