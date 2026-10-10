import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { uniqueSuffix } from "@coss/db/testing";
import { getMembership, listOrganizationMembers, listPendingInvitations } from "../src/index.ts";
import { addMember, createTestUser } from "../src/testing.ts";
import { createTestOrganization } from "./helpers.ts";

describe("getMembership", () => {
  test("finds the member row by organization slug and user", async () => {
    const { owner, organization } = await createTestOrganization();
    const membership = await getMembership({
      userId: owner.id,
      organizationSlug: organization.slug,
    });
    expect(membership?.organization).toMatchObject({
      id: organization.id,
      slug: organization.slug,
    });
    expect(membership?.member).toMatchObject({
      organizationId: organization.id,
      userId: owner.id,
      role: "owner",
    });
  });

  test("is null for non-members and unknown slugs", async () => {
    const { owner, organization } = await createTestOrganization();
    const outsider = await createTestUser();
    expect(
      await getMembership({ userId: outsider.id, organizationSlug: organization.slug }),
    ).toBeNull();
    expect(
      await getMembership({ userId: owner.id, organizationSlug: `missing-${uniqueSuffix()}` }),
    ).toBeNull();
  });
});

describe("listOrganizationMembers", () => {
  test("lists members with emails, oldest first, scoped to the organization", async () => {
    const { owner, organization } = await createTestOrganization();
    const other = await createTestOrganization();
    const teammate = await createTestUser();
    await addMember({ organizationId: organization.id, userId: teammate.id, role: "member" });

    const members = await listOrganizationMembers({ organizationId: organization.id });
    expect(members.map((m) => [m.user.email, m.role])).toEqual([
      [owner.email, "owner"],
      [teammate.email, "member"],
    ]);
    expect(members.some((m) => m.user.id === other.owner.id)).toBe(false);
  });
});

describe("listPendingInvitations", () => {
  test("returns only pending, unexpired invitations of the organization", async () => {
    const { owner, organization } = await createTestOrganization();
    const other = await createTestOrganization();
    const hour = 60 * 60 * 1000;
    const invite = (organizationId: string, status: string, expiresInMs: number) => ({
      id: newId("invite"),
      organizationId,
      email: `invitee-${uniqueSuffix()}@coss.test`,
      role: "member",
      status,
      expiresAt: new Date(Date.now() + expiresInMs),
      inviterId: organizationId === organization.id ? owner.id : other.owner.id,
    });
    const pending = invite(organization.id, "pending", hour);
    await db
      .insert(schema.invitation)
      .values([
        pending,
        invite(organization.id, "pending", -hour),
        invite(organization.id, "canceled", hour),
        invite(organization.id, "accepted", hour),
        invite(other.organization.id, "pending", hour),
      ]);

    const invitations = await listPendingInvitations({ organizationId: organization.id });
    expect(invitations.map((i) => i.id)).toEqual([pending.id]);
    expect(invitations[0]).toMatchObject({ email: pending.email, role: "member" });
  });
});
