import { describe, expect, test } from "bun:test";
import { type OrgAccessMembership, type OrgAccessSession, orgAccess } from "../src/lib/org-access";

function membership(
  overrides: Partial<OrgAccessMembership["organization"]> & { role?: string } = {},
): OrgAccessMembership {
  const { role = "member", ...organization } = overrides;
  return {
    organization: { slug: "acme", requireTwoFactor: false, requireSso: false, ...organization },
    member: { role },
    ssoProviderId: "sso_acme",
  };
}

function session(
  overrides: { ssoProviderId?: string | null; impersonatedBy?: string; twoFactor?: boolean } = {},
): OrgAccessSession {
  return {
    session: {
      ssoProviderId: overrides.ssoProviderId ?? null,
      impersonatedBy: overrides.impersonatedBy ?? null,
    },
    user: { twoFactorEnabled: overrides.twoFactor ?? false },
  };
}

describe("orgAccess", () => {
  test("no requirements: everyone is allowed", () => {
    expect(orgAccess(membership(), session())).toEqual({
      kind: "allowed",
      viaSso: false,
      breakGlass: false,
    });
  });

  test("SSO required: members need a session from the organization's provider", () => {
    const required = membership({ requireSso: true });
    expect(orgAccess(required, session())).toEqual({ kind: "redirect", to: "/sso?org=acme" });
    expect(orgAccess(required, session({ ssoProviderId: "sso_other" }))).toEqual({
      kind: "redirect",
      to: "/sso?org=acme",
    });
    expect(orgAccess(required, session({ ssoProviderId: "sso_acme" }))).toEqual({
      kind: "allowed",
      viaSso: true,
      breakGlass: false,
    });
  });

  test("owners keep break-glass access without SSO", () => {
    expect(orgAccess(membership({ requireSso: true, role: "owner" }), session())).toEqual({
      kind: "allowed",
      viaSso: false,
      breakGlass: true,
    });
    expect(orgAccess(membership({ requireSso: true, role: "admin" }), session()).kind).toBe(
      "redirect",
    );
  });

  test("impersonating admins are not held to SSO", () => {
    expect(
      orgAccess(membership({ requireSso: true }), session({ impersonatedBy: "user_admin" })).kind,
    ).toBe("allowed");
  });

  test("SSO from the organization's provider satisfies its two-factor requirement", () => {
    const twoFactor = membership({ requireTwoFactor: true });
    expect(orgAccess(twoFactor, session())).toEqual({ kind: "redirect", to: "/settings" });
    expect(orgAccess(twoFactor, session({ twoFactor: true })).kind).toBe("allowed");
    expect(orgAccess(twoFactor, session({ ssoProviderId: "sso_acme" })).kind).toBe("allowed");
    expect(orgAccess(twoFactor, session({ ssoProviderId: "sso_other" }))).toEqual({
      kind: "redirect",
      to: "/settings",
    });
  });

  test("break-glass owners still need two-factor when it is required", () => {
    const both = membership({ requireSso: true, requireTwoFactor: true, role: "owner" });
    expect(orgAccess(both, session())).toEqual({ kind: "redirect", to: "/settings" });
    expect(orgAccess(both, session({ twoFactor: true })).kind).toBe("allowed");
  });

  test("an organization without a provider never matches a session", () => {
    const noProvider = { ...membership({ requireTwoFactor: true }), ssoProviderId: null };
    expect(orgAccess(noProvider, session({ ssoProviderId: null })).kind).toBe("redirect");
  });
});
