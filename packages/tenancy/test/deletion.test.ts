import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import {
  type AdminActor,
  deleteOrganizationAsAdmin,
  getOrganizationForAdmin,
  listAdminAuditEvents,
  suspendOrganization,
} from "../src/admin.ts";
import { runDueOrganizationDeletions } from "../src/deletion.ts";
import {
  authenticateApiKey,
  getMembership,
  getOrganizationDeletion,
  isOrganizationBeingDeleted,
  promoteToAdmin,
  requestOrganizationDeletion,
  TenancyError,
} from "../src/index.ts";
import { addMember, createTestTenant, createTestUser, type TestTenant } from "../src/testing.ts";

async function adminActor(): Promise<AdminActor> {
  const user = await createTestUser();
  await promoteToAdmin(user.email);
  return { userId: user.id, email: user.email };
}

function ownerOf(tenant: TestTenant) {
  return { userId: tenant.owner.id, email: tenant.owner.email };
}

async function count(table: typeof schema.email | typeof schema.webhookMessage, orgId: string) {
  return (await db.select({ id: table.id }).from(table).where(eq(table.organizationId, orgId)))
    .length;
}

/** A bit of everything an organization accumulates, written directly. */
async function seedOrganizationData(tenant: TestTenant) {
  const organizationId = tenant.organization.id;
  const environment = tenant.production;
  const scope = { organizationId, projectId: tenant.project.id, environmentId: environment.id };
  const emails = await db
    .insert(schema.email)
    .values(
      Array.from({ length: 5 }, (_, index) => ({
        ...scope,
        from: "hello@example.test",
        to: [`to-${index}@example.test`],
        subject: `Email ${index}`,
        status: index === 0 ? ("scheduled" as const) : ("sent" as const),
        scheduledAt: index === 0 ? new Date(Date.now() + 60_000) : null,
      })),
    )
    .returning({ id: schema.email.id });
  for (const [index, { id: emailId }] of emails.entries()) {
    await db.insert(schema.emailRecipient).values({
      organizationId,
      emailId,
      address: `to-${index}@example.test`,
      kind: "to",
      position: 0,
    });
    await db.insert(schema.emailEvent).values({
      organizationId,
      environmentId: environment.id,
      emailId,
      type: "email.sent",
      provider: "fake",
      providerEventType: "Send",
      occurredAt: new Date(),
      dedupeKey: "send",
    });
  }
  await db.insert(schema.emailBatch).values(scope);
  await db.insert(schema.emailSuppression).values(
    Array.from({ length: 3 }, (_, index) => ({
      ...scope,
      address: `sup-${index}@example.test`,
      scope: "*",
      reason: "manual" as const,
    })),
  );
  const [endpoint] = await db
    .insert(schema.webhookEndpoint)
    .values({
      ...scope,
      url: "https://example.test/hook",
      apiVersion: "2026-01-01",
      secretCiphertext: "x",
    })
    .returning({ id: schema.webhookEndpoint.id });
  for (let index = 0; index < 3; index++) {
    const messageId = newId(ID_PREFIXES.webhookEvent);
    await db.insert(schema.webhookMessage).values({
      id: messageId,
      organizationId,
      environmentId: environment.id,
      type: "email.sent",
      payload: {},
    });
    await db
      .insert(schema.webhookDelivery)
      .values({ organizationId, messageId, endpointId: endpoint?.id ?? "" });
  }
  await db.insert(schema.contentScreening).values({
    organizationId,
    environmentId: environment.id,
    product: "email",
    subjectId: emails[1]?.id ?? "",
    sequence: 1,
    classifier: "fake",
    verdict: "clean",
    latencyMs: 1,
  });
  await db.insert(schema.domain).values({
    organizationId,
    name: `d-${uniqueSuffix()}.test`,
    provider: "fake",
    mailFromDomain: "send.example.test",
  });
  await db.insert(schema.reputationStanding).values({ organizationId });
}

describe("requestOrganizationDeletion", () => {
  test("locks everyone out at once", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const member = await createTestUser();
    await addMember({ organizationId, userId: member.id, role: "member" });
    await db.insert(schema.invitation).values({
      id: newId(ID_PREFIXES.invitation),
      organizationId,
      email: `invitee-${uniqueSuffix()}@example.test`,
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 86_400_000),
      inviterId: tenant.owner.id,
    });

    const deletion = await requestOrganizationDeletion({
      organizationId,
      actor: ownerOf(tenant),
    });
    expect(deletion).toMatchObject({
      organizationId,
      organizationSlug: tenant.organization.slug,
      requestedByEmail: tenant.owner.email,
      byPlatformAdmin: false,
      status: "pending",
    });
    expect(await isOrganizationBeingDeleted(organizationId)).toBe(true);
    for (const userId of [tenant.owner.id, member.id]) {
      expect(
        await getMembership({ userId, organizationSlug: tenant.organization.slug }),
      ).toBeNull();
    }
    expect(await authenticateApiKey(tenant.liveKey)).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticateApiKey(tenant.sandboxKey)).toEqual({ ok: false, reason: "invalid" });
    const keys = await db
      .select({ id: schema.apikey.id })
      .from(schema.apikey)
      .where(eq(schema.apikey.referenceId, organizationId));
    expect(keys).toEqual([]);
    const invitations = await db
      .select({ id: schema.invitation.id })
      .from(schema.invitation)
      .where(eq(schema.invitation.organizationId, organizationId));
    expect(invitations).toEqual([]);
    // The data stays until the worker deletes it.
    expect(await getOrganizationForAdmin(organizationId)).not.toBeNull();

    await expect(
      requestOrganizationDeletion({ organizationId, actor: ownerOf(tenant) }),
    ).rejects.toThrow("This organization is already being deleted.");
  });

  test("members can't delete a suspended organization; platform admins can, audited", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const actor = await adminActor();
    await suspendOrganization({ organizationId, reason: "Phishing", actor });

    const refused = await requestOrganizationDeletion({
      organizationId,
      actor: ownerOf(tenant),
    }).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(TenancyError);
    expect((refused as TenancyError).code).toBe("forbidden");

    await expect(
      deleteOrganizationAsAdmin({ organizationId, confirmSlug: "nope", reason: "Closed", actor }),
    ).rejects.toThrow(`Type ${tenant.organization.slug} to confirm.`);
    await expect(
      deleteOrganizationAsAdmin({
        organizationId,
        confirmSlug: tenant.organization.slug,
        reason: "",
        actor,
      }),
    ).rejects.toThrow("Enter a reason.");
    expect(await getOrganizationDeletion(organizationId)).toBeNull();

    await deleteOrganizationAsAdmin({
      organizationId,
      confirmSlug: tenant.organization.slug,
      reason: "Account closure, ticket 42",
      actor,
    });
    expect(await getOrganizationDeletion(organizationId)).toMatchObject({
      byPlatformAdmin: true,
      requestedByEmail: actor.email,
    });
    expect((await getOrganizationForAdmin(organizationId))?.deletion?.status).toBe("pending");
    const { events } = await listAdminAuditEvents({ organizationId });
    expect(events[0]).toMatchObject({
      action: "organization.delete",
      reason: "Account closure, ticket 42",
      metadata: { slug: tenant.organization.slug },
    });
  });
});

describe("runDueOrganizationDeletions", () => {
  test("releases provider resources, deletes the data in batches, then the organization", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    await seedOrganizationData(tenant);
    await requestOrganizationDeletion({ organizationId, actor: ownerOf(tenant) });

    const released: string[] = [];
    const claimed = await runDueOrganizationDeletions(
      { batchSize: 2, scope: { organizationIds: [organizationId] } },
      {
        releaseProviderResources: async (id) => {
          released.push(id);
        },
      },
    );
    expect(claimed).toBe(1);
    expect(released).toEqual([organizationId]);
    expect(await getOrganizationForAdmin(organizationId)).toBeNull();
    expect(await count(schema.email, organizationId)).toBe(0);
    expect(await count(schema.webhookMessage, organizationId)).toBe(0);
    for (const table of [
      schema.emailRecipient,
      schema.emailEvent,
      schema.emailSuppression,
      schema.webhookDelivery,
      schema.contentScreening,
      schema.domain,
    ]) {
      const rows = await db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.organizationId, organizationId));
      expect(rows).toEqual([]);
    }
    const standing = await db
      .select()
      .from(schema.reputationStanding)
      .where(eq(schema.reputationStanding.organizationId, organizationId));
    expect(standing).toEqual([]);

    // The record stays, and the slug is free again.
    const deletion = await getOrganizationDeletion(organizationId);
    expect(deletion).toMatchObject({ status: "completed", nextAttemptAt: null, lastError: null });
    expect(deletion?.completedAt).toBeInstanceOf(Date);
    expect(
      await runDueOrganizationDeletions(
        { scope: { organizationIds: [organizationId] } },
        { releaseProviderResources: async () => {} },
      ),
    ).toBe(0);
  });

  test("a failure is recorded and retried with backoff", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    await requestOrganizationDeletion({ organizationId, actor: ownerOf(tenant) });
    const scope = { organizationIds: [organizationId] };
    const failing = {
      releaseProviderResources: async () => {
        throw new Error("SES is down");
      },
    };

    const errors = console.error;
    console.error = () => {};
    try {
      expect(await runDueOrganizationDeletions({ scope }, failing)).toBe(1);
    } finally {
      console.error = errors;
    }
    const failed = await getOrganizationDeletion(organizationId);
    expect(failed).toMatchObject({ status: "pending", attemptCount: 1, lastError: "SES is down" });
    expect(failed?.nextAttemptAt?.getTime()).toBeGreaterThan(Date.now() + 30_000);
    expect(await getOrganizationForAdmin(organizationId)).not.toBeNull();
    // Not due yet.
    expect(await runDueOrganizationDeletions({ scope }, failing)).toBe(0);

    const later = new Date(Date.now() + 2 * 60_000);
    expect(
      await runDueOrganizationDeletions(
        { scope, now: later },
        { releaseProviderResources: async () => {} },
      ),
    ).toBe(1);
    expect(await getOrganizationDeletion(organizationId)).toMatchObject({
      status: "completed",
      attemptCount: 2,
    });
    expect(await getOrganizationForAdmin(organizationId)).toBeNull();
  });

  test("stops between batches on shutdown and resumes on the next run", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    await seedOrganizationData(tenant);
    await requestOrganizationDeletion({ organizationId, actor: ownerOf(tenant) });
    const scope = { organizationIds: [organizationId] };
    const controller = new AbortController();

    await runDueOrganizationDeletions(
      { scope, batchSize: 1, signal: controller.signal },
      { releaseProviderResources: async () => controller.abort() },
    );
    const paused = await getOrganizationDeletion(organizationId);
    expect(paused?.status).toBe("pending");
    expect(paused?.nextAttemptAt?.getTime()).toBeLessThanOrEqual(Date.now());
    expect(await count(schema.email, organizationId)).toBe(5);

    await runDueOrganizationDeletions({ scope }, { releaseProviderResources: async () => {} });
    expect((await getOrganizationDeletion(organizationId))?.status).toBe("completed");
    expect(await count(schema.email, organizationId)).toBe(0);
  });
});
