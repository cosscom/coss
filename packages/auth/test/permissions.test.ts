import { describe, expect, test } from "bun:test";
import { assignableOrgRoles, orgRoleCan, orgRoles } from "../src/permissions.ts";

describe("org roles", () => {
  test("owner keeps Better Auth defaults and gets full COSS access", () => {
    expect(
      orgRoles.owner.authorize({
        organization: ["update", "delete"],
        member: ["create", "update", "delete"],
        invitation: ["create", "cancel"],
        apiKey: ["create", "delete"],
        project: ["create"],
        email: ["send"],
      }).success,
    ).toBe(true);
  });

  test("admin cannot delete the organization but can manage keys", () => {
    expect(orgRoles.admin.authorize({ organization: ["delete"] }).success).toBe(false);
    expect(orgRoles.admin.authorize({ invitation: ["create"], apiKey: ["create"] }).success).toBe(
      true,
    );
  });

  test("member is read-only", () => {
    expect(orgRoles.member.authorize({ apiKey: ["read"], project: ["read"] }).success).toBe(true);
    expect(orgRoles.member.authorize({ apiKey: ["create"] }).success).toBe(false);
    expect(orgRoles.member.authorize({ project: ["create"] }).success).toBe(false);
    expect(orgRoles.member.authorize({ invitation: ["create"] }).success).toBe(false);
  });
});

describe("orgRoleCan", () => {
  test("handles comma-joined roles and unknown roles", () => {
    expect(orgRoleCan("member,admin", { apiKey: ["create"] })).toBe(true);
    expect(orgRoleCan("member", { apiKey: ["create"] })).toBe(false);
    expect(orgRoleCan("nope", { project: ["read"] })).toBe(false);
    expect(orgRoleCan(null, { project: ["read"] })).toBe(false);
  });

  test("role names must match exactly (Better Auth does not trim them)", () => {
    expect(orgRoleCan(" owner", { apiKey: ["create"] })).toBe(false);
    expect(orgRoleCan("owner ", { apiKey: ["create"] })).toBe(false);
    expect(orgRoleCan("constructor", { project: ["read"] })).toBe(false);
  });
});

describe("assignableOrgRoles", () => {
  test("owners may assign every role to anyone, including other owners and themselves", () => {
    expect(assignableOrgRoles("owner", "member")).toEqual(["member", "admin", "owner"]);
    expect(assignableOrgRoles("owner", "owner")).toEqual(["member", "admin", "owner"]);
  });

  test("admins may switch non-owners between member and admin, but never touch an owner", () => {
    expect(assignableOrgRoles("admin", "member")).toEqual(["member", "admin"]);
    expect(assignableOrgRoles("admin", "admin")).toEqual(["member", "admin"]);
    expect(assignableOrgRoles("admin", "owner")).toEqual([]);
    expect(assignableOrgRoles("admin", "member,owner")).toEqual([]);
  });

  test("members and unknown roles may not change anyone", () => {
    expect(assignableOrgRoles("member", "member")).toEqual([]);
    expect(assignableOrgRoles("nope", "member")).toEqual([]);
    expect(assignableOrgRoles(" owner", "member")).toEqual([]);
  });

  test("comma-joined actor roles use their most privileged role", () => {
    expect(assignableOrgRoles("member,owner", "owner")).toEqual(["member", "admin", "owner"]);
    expect(assignableOrgRoles("member,admin", "member")).toEqual(["member", "admin"]);
  });
});
