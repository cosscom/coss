import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { uniqueSuffix } from "@coss/db/testing";
import {
  getMembership,
  getOrganizationMember,
  getPendingInvitation,
  listOrganizationMembers,
  listPendingInvitations,
} from "../src/index.ts";
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

describe("getOrganizationMember", () => {
  test("finds a member of the organization, and only of that organization", async () => {
    const { organization } = await createTestOrganization();
    const other = await createTestOrganization();
    const teammate = await createTestUser();
    await addMember({ organizationId: organization.id, userId: teammate.id, role: "admin" });
    const [, row] = await listOrganizationMembers({ organizationId: organization.id });
    if (!row) throw new Error("teammate missing");

    expect(
      await getOrganizationMember({ organizationId: organization.id, memberId: row.id }),
    ).toEqual(row);
    expect(row).toMatchObject({ role: "admin", user: { id: teammate.id, email: teammate.email } });
    expect(
      await getOrganizationMember({ organizationId: other.organization.id, memberId: row.id }),
    ).toBeNull();
    expect(
      await getOrganizationMember({ organizationId: organization.id, memberId: newId("member") }),
    ).toBeNull();
  });
});

describe("getPendingInvitation", () => {
  test("finds a pending, unexpired invitation of the organization only", async () => {
    const { owner, organization } = await createTestOrganization();
    const other = await createTestOrganization();
    const hour = 60 * 60 * 1000;
    const invite = (status: string, expiresInMs: number) => ({
      id: newId("invite"),
      organizationId: organization.id,
      email: `invitee-${uniqueSuffix()}@coss.test`,
      role: "admin",
      status,
      expiresAt: new Date(Date.now() + expiresInMs),
      inviterId: owner.id,
    });
    const pending = invite("pending", hour);
    const expired = invite("pending", -hour);
    const canceled = invite("canceled", hour);
    const accepted = invite("accepted", hour);
    await db.insert(schema.invitation).values([pending, expired, canceled, accepted]);

    const find = (organizationId: string, invitationId: string) =>
      getPendingInvitation({ organizationId, invitationId });
    expect(await find(organization.id, pending.id)).toMatchObject({
      id: pending.id,
      email: pending.email,
      role: "admin",
    });
    expect(await find(other.organization.id, pending.id)).toBeNull();
    for (const { id } of [expired, canceled, accepted]) {
      expect(await find(organization.id, id)).toBeNull();
    }
  });
});
