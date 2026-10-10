import { describe, expect, test } from "bun:test";
import { newId } from "@coss/db/id";
import { createTestTenant } from "@coss/tenancy/testing";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { getEmail, listEmails } from "../src/read.ts";
import { createEmailService } from "../src/service.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

const provider = new FakeEmailProvider({ log: false });
const service = createEmailService({ liveProvider: provider, sandboxProvider: provider });

describe("getEmail", () => {
  test("is scoped to the organization and environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { email: sandboxed } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    const { email: live } = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id) }),
    });

    const org = tenant.organization.id;
    expect(
      await getEmail({
        organizationId: org,
        environmentId: tenant.development.id,
        id: sandboxed.id,
      }),
    ).toEqual({ ...sandboxed, sandbox: true });
    expect(
      await getEmail({ organizationId: org, environmentId: tenant.production.id, id: live.id }),
    ).toMatchObject({ id: live.id, sandbox: false });

    // Other environment, other organization, unknown and malformed ids.
    expect(
      await getEmail({
        organizationId: org,
        environmentId: tenant.production.id,
        id: sandboxed.id,
      }),
    ).toBeNull();
    expect(
      await getEmail({
        organizationId: other.organization.id,
        environmentId: tenant.development.id,
        id: sandboxed.id,
      }),
    ).toBeNull();
    for (const id of [newId("email"), "email_123", "nope", newId("key"), ""]) {
      expect(
        await getEmail({ organizationId: org, environmentId: tenant.development.id, id }),
      ).toBeNull();
    }
  });
});

describe("listEmails", () => {
  test("lists an environment's emails newest first", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const environment = sendEnvironment(tenant.development);
    const sent = [];
    for (const subject of ["One", "Two", "Three"]) {
      sent.push(
        (await service.send({ environment, apiKeyId: null, params: params({ subject }) })).email,
      );
    }
    await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ subject: "Live", from: await verifiedFrom(tenant.organization.id) }),
    });

    const org = tenant.organization.id;
    const listed = await listEmails({ organizationId: org, environmentId: tenant.development.id });
    expect(listed.map((e) => e.subject)).toEqual(["Three", "Two", "One"]);
    expect(listed.every((e) => e.sandbox)).toBe(true);
    expect(listed[0]).toEqual(sent[2]);

    expect(
      await listEmails({ organizationId: org, environmentId: tenant.development.id, limit: 2 }),
    ).toHaveLength(2);
    expect(
      await listEmails({ organizationId: org, environmentId: tenant.development.id, limit: 0 }),
    ).toHaveLength(1);
    expect(
      (await listEmails({ organizationId: org, environmentId: tenant.production.id })).map((e) => [
        e.subject,
        e.sandbox,
      ]),
    ).toEqual([["Live", false]]);
    expect(
      await listEmails({
        organizationId: other.organization.id,
        environmentId: tenant.development.id,
      }),
    ).toEqual([]);
  });
});
