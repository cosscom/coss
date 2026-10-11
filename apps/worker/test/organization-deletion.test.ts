/**
 * Organization deletion end to end, wired as the worker wires it: the request locks everyone out,
 * then the teardown releases the SES identities and tenant and deletes everything else.
 */
import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import {
  createDomain,
  createTrackingDomain,
  FakeEmailProvider,
  FakeTrackingHostnameProvider,
  releaseOrganizationEmailResources,
} from "@coss/email";
import { SesIdentityProvider } from "@coss/email/ses";
import { dispatchingEmailService, FakeSesApi } from "@coss/email/testing";
import { getOrganizationDeletion, requestOrganizationDeletion } from "@coss/tenancy";
import { runDueOrganizationDeletions } from "@coss/tenancy/deletion";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";

describe("organization deletion", () => {
  test("releases SES resources and deletes the organization with its emails", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, {
      region: "eu-west-1",
      configurationSet: "coss-test",
      tenantPrefix: "test",
    });
    const tracking = new FakeTrackingHostnameProvider();
    const domain = await createDomain(
      { organizationId, name: `gone-${Date.now()}.com`, userId: null },
      { identity, dns: null, tracking },
    );
    await db
      .update(schema.domain)
      .set({ status: "verified" })
      .where(eq(schema.domain.id, domain.id));
    const hostname = `links.${domain.name}`;
    await createTrackingDomain(
      { organizationId, domainId: domain.id, hostname },
      { identity, dns: null, tracking },
    );
    expect(tracking.hostnames).toContain(hostname);
    const provider = new FakeEmailProvider({ log: false });
    const service = dispatchingEmailService({ liveProvider: provider, sandboxProvider: provider });
    await service.send({
      environment: {
        organizationId,
        projectId: tenant.project.id,
        environmentId: tenant.development.id,
        mode: "sandbox",
      },
      apiKeyId: null,
      params: {
        from: "hello@example.com",
        to: ["a@example.com"],
        cc: [],
        bcc: [],
        reply_to: [],
        subject: "Hi",
        html: null,
        text: "Hi",
        headers: {},
        tags: [],
      },
    });

    await requestOrganizationDeletion({
      organizationId,
      actor: { userId: tenant.owner.id, email: tenant.owner.email },
    });
    await runDueOrganizationDeletions(
      { scope: { organizationIds: [organizationId] } },
      {
        releaseProviderResources: (id, assertLease) =>
          releaseOrganizationEmailResources(id, { identity, tracking }, assertLease),
      },
    );

    expect((await getOrganizationDeletion(organizationId))?.status).toBe("completed");
    expect(api.identities.has(domain.name)).toBe(false);
    expect(tracking.hostnames).toEqual([]);
    expect(api.tenants.has(`test-${organizationId}`)).toBe(false);
    const organizations = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.id, organizationId));
    expect(organizations).toEqual([]);
    const emails = await db
      .select({ id: schema.email.id })
      .from(schema.email)
      .where(eq(schema.email.organizationId, organizationId));
    expect(emails).toEqual([]);
  });
});
