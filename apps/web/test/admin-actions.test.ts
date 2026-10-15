import { beforeEach, describe, expect, mock, test } from "bun:test";
import { newId } from "@coss/db/id";

// Keep this suite DB-free; exercise the actual actions with their external boundaries mocked.
mock.module("server-only", () => ({}));
mock.module("@coss/email", () => ({
  DomainError: class extends Error {},
  EmailError: class extends Error {},
}));
mock.module("@coss/tenancy", () => ({ TenancyError: class extends Error {} }));
const audit = mock(async () => {});
mock.module("@coss/tenancy/admin", () => ({
  ADMIN_REASON_MAX_LENGTH: 500,
  deleteOrganizationAsAdmin: mock(async () => {}),
  disableOrganizationScim: mock(async () => ({ complete: true })),
  disableOrganizationSso: mock(async () => {}),
  disableOrganizationSsoRequirement: mock(async () => {}),
  planOrganizationTakedown: mock(),
  recordAdminAction: audit,
  resetUserTwoFactor: mock(async () => {}),
  revokeApiKeyAsAdmin: mock(),
  suspendOrganization: mock(),
  unlinkUserSso: mock(async () => {}),
  unsuspendOrganization: mock(),
}));
const emailContext = { organizationId: newId("org"), organizationSlug: "spam-co" };
const emailContent = mock(async () => ({
  organizationId: emailContext.organizationId,
  html: "<p>Win</p>",
  text: "Win",
}));
mock.module("@coss/email/admin", () => ({
  getEmailForAdmin: async () => emailContext,
  getEmailContentForAdmin: emailContent,
}));
const changeRateLimitOverride = mock(async () => true);
const ratelimit = await import("@coss/ratelimit");
mock.module("@coss/ratelimit", () => ({ ...ratelimit, changeRateLimitOverride }));
mock.module("next/cache", () => ({ refresh: mock() }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
const redirected = new Error("redirect");
mock.module("next/navigation", () => ({
  redirect: () => {
    throw redirected;
  },
  unstable_rethrow: (error: unknown) => {
    if (error === redirected) throw error;
  },
}));
mock.module("@/lib/session", () => ({
  requirePlatformAdminAction: async () => ({
    actor: { userId: newId("user"), email: "admin@test.local" },
    session: { user: { id: newId("user") } },
  }),
}));
const systemOrgId = newId("org");
const SYSTEM_ORGANIZATION_MESSAGE = "COSS's own organization";
mock.module("@/lib/system-organization", () => ({
  SYSTEM_ORGANIZATION_MESSAGE,
  isSystemOrganization: async (organizationId: string) => organizationId === systemOrgId,
}));
const suspendSending = mock(async () => ({ id: "repev" }));
const reputationModule = await import("@coss/reputation");
mock.module("@coss/reputation", () => ({
  ...reputationModule,
  getOrganizationStanding: async () => ({}),
  reinstateOrganization: mock(),
  suspendOrganization: suspendSending,
  updateReputationPolicy: mock(),
}));
const supportAudit = mock(async () => {});
mock.module("@/lib/audit", () => ({ supportAudit }));
const mutate = mock(async () => ({}));
mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getUser: async () => ({ email: "target@test.local" }),
      listUserSessions: async () => ({ sessions: [{ id: "session", token: "secret" }] }),
      banUser: mutate,
      unbanUser: mutate,
      setRole: mutate,
      revokeUserSessions: mutate,
      revokeUserSession: mutate,
      impersonateUser: mutate,
    },
  },
}));
const {
  deleteOrganizationAsAdmin,
  resetUserTwoFactor,
  unlinkUserSso,
  disableOrganizationScim,
  disableOrganizationSso,
  disableOrganizationSsoRequirement,
} = (await import("@coss/tenancy/admin")) as unknown as Record<
  | "deleteOrganizationAsAdmin"
  | "resetUserTwoFactor"
  | "unlinkUserSso"
  | "disableOrganizationScim"
  | "disableOrganizationSso"
  | "disableOrganizationSsoRequirement",
  ReturnType<typeof mock>
>;
const actions = await import("../src/app/admin/actions");
const cases = [
  ["ban", actions.banUserAction, true],
  ["unban", actions.unbanUserAction, false],
  ["role change", actions.setUserRoleAction, false],
  ["revoke sessions", actions.revokeUserSessionsAction, false],
  ["revoke session", actions.revokeUserSessionAction, false],
  ["impersonate", actions.impersonateUserAction, true],
] as const;

beforeEach(() => {
  mutate.mockClear();
  audit.mockClear();
});

for (const [name, action, required] of cases) {
  describe(name, () => {
    function form(reason: string) {
      const data = new FormData();
      data.set("userId", newId("user"));
      data.set("role", "admin");
      data.set("sessionId", "session");
      data.set("reason", reason);
      return data;
    }
    test("rejects an oversized reason before any mutation", async () => {
      expect(await action(null, form("x".repeat(501)))).toEqual({
        ok: false,
        error: "The reason must be at most 500 characters.",
      });
      expect(mutate).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    });
    test("accepts and audits a trimmed reason at the limit", async () => {
      const result = action(null, form(` ${"x".repeat(500)} `));
      if (name === "impersonate") await expect(result).rejects.toBe(redirected);
      else expect(await result).toEqual({ ok: true, data: null });
      expect(mutate).toHaveBeenCalledTimes(1);
      expect(audit).toHaveBeenCalledWith(expect.objectContaining({ reason: "x".repeat(500) }));
    });
    test("handles an empty reason according to the action requirement", async () => {
      const result = await action(null, form("   "));
      expect(result.ok).toBe(!required);
      expect(mutate).toHaveBeenCalledTimes(required ? 0 : 1);
      if (!required) expect(audit).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
    });
  });
}

describe("reset two-factor", () => {
  function form(userId: string, reason: string) {
    const data = new FormData();
    data.set("userId", userId);
    data.set("reason", reason);
    return data;
  }

  beforeEach(() => resetUserTwoFactor.mockClear());

  test("requires a reason and passes it, with the actor, to the audited reset", async () => {
    expect((await actions.resetTwoFactorAction(null, form(newId("user"), "  "))).ok).toBe(false);
    expect(resetUserTwoFactor).not.toHaveBeenCalled();

    const userId = newId("user");
    expect(await actions.resetTwoFactorAction(null, form(userId, " Lost phone "))).toEqual({
      ok: true,
      data: null,
    });
    expect(resetUserTwoFactor).toHaveBeenCalledWith(
      expect.objectContaining({ userId, reason: "Lost phone", actor: expect.any(Object) }),
    );
  });

  test("rejects anything but a user id", async () => {
    expect((await actions.resetTwoFactorAction(null, form("org_x", "Lost phone"))).ok).toBe(false);
    expect(resetUserTwoFactor).not.toHaveBeenCalled();
  });
});

describe("SSO recovery", () => {
  function form(field: "userId" | "organizationId", id: string, reason: string) {
    const data = new FormData();
    data.set(field, id);
    data.set("reason", reason);
    return data;
  }

  beforeEach(() => {
    unlinkUserSso.mockClear();
    disableOrganizationScim.mockClear();
    disableOrganizationSso.mockClear();
    disableOrganizationSsoRequirement.mockClear();
    supportAudit.mockClear();
  });

  test("unlinking a user's SSO accounts needs a user id and a reason", async () => {
    expect((await actions.unlinkUserSsoAction(null, form("userId", newId("user"), " "))).ok).toBe(
      false,
    );
    expect((await actions.unlinkUserSsoAction(null, form("userId", "org_x", "IdP"))).ok).toBe(
      false,
    );
    expect(unlinkUserSso).not.toHaveBeenCalled();

    const userId = newId("user");
    expect(await actions.unlinkUserSsoAction(null, form("userId", userId, " IdP reset "))).toEqual({
      ok: true,
      data: null,
    });
    expect(unlinkUserSso).toHaveBeenCalledWith(
      expect.objectContaining({ userId, reason: "IdP reset", actor: expect.any(Object) }),
    );
  });

  for (const [name, action, target] of [
    [
      "stop requiring SSO",
      actions.disableOrganizationSsoRequirementAction,
      () => disableOrganizationSsoRequirement,
    ],
    ["disable SSO", actions.disableOrganizationSsoAction, () => disableOrganizationSso],
    ["disconnect SCIM", actions.disableOrganizationScimAction, () => disableOrganizationScim],
  ] as const) {
    test(`${name} needs an organization id and a reason`, async () => {
      const organizationId = newId("org");
      expect((await action(null, form("organizationId", organizationId, ""))).ok).toBe(false);
      expect((await action(null, form("organizationId", newId("user"), "Outage"))).ok).toBe(false);
      expect(target()).not.toHaveBeenCalled();
      expect(await action(null, form("organizationId", organizationId, "Outage"))).toEqual({
        ok: true,
        data: null,
      });
      expect(target()).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId, reason: "Outage", actor: expect.any(Object) }),
      );
      // The organization's own audit log names "COSS support", never the reason.
      expect(supportAudit).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(supportAudit.mock.calls)).not.toContain("Outage");
    });
  }

  test("disconnecting SCIM reports a directory that is still being released", async () => {
    disableOrganizationScim.mockImplementationOnce(async () => ({ complete: false }));
    const result = await actions.disableOrganizationScimAction(
      null,
      form("organizationId", newId("org"), "Token leaked"),
    );
    expect(result.ok).toBe(false);
  });
});

describe("organization deletion", () => {
  test("needs an organization id and a reason, and passes the typed slug on", async () => {
    const organizationId = newId("org");
    const form = (id: string, reason: string) => {
      const data = new FormData();
      data.set("organizationId", id);
      data.set("confirm", " acme ");
      data.set("reason", reason);
      return data;
    };
    expect((await actions.deleteOrganizationAdminAction(null, form(organizationId, ""))).ok).toBe(
      false,
    );
    expect(
      (await actions.deleteOrganizationAdminAction(null, form(newId("user"), "Closure"))).ok,
    ).toBe(false);
    expect(deleteOrganizationAsAdmin).not.toHaveBeenCalled();

    expect(
      await actions.deleteOrganizationAdminAction(null, form(organizationId, "Closure")),
    ).toEqual({ ok: true, data: null });
    expect(deleteOrganizationAsAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        confirmSlug: "acme",
        reason: "Closure",
        actor: expect.any(Object),
      }),
    );
  });
});

describe("rate limit overrides", () => {
  function form(fields: Record<string, string>) {
    const data = new FormData();
    data.set("organizationId", newId("org"));
    data.set("bucket", "email.recipients.day");
    data.set("limit", "50000");
    data.set("period", "1d");
    data.set("reason", "Upgrade");
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  }

  beforeEach(() => changeRateLimitOverride.mockClear());

  test("sets a validated rule with the actor and reason", async () => {
    expect(await actions.setRateLimitOverrideAction(null, form({ burst: "60000" }))).toEqual({
      ok: true,
      data: null,
    });
    expect(changeRateLimitOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "email.recipients.day",
        rule: { limit: 50_000, periodMs: 86_400_000, burst: 60_000 },
        reason: "Upgrade",
        actor: expect.any(Object),
      }),
    );
    await actions.setRateLimitOverrideAction(null, form({ burst: "" }));
    expect(changeRateLimitOverride).toHaveBeenLastCalledWith(
      expect.objectContaining({ rule: { limit: 50_000, periodMs: 86_400_000 } }),
    );
  });

  for (const [name, fields, error] of [
    ["a non-overridable bucket", { bucket: "auth.sign_in.ip" }, /can't be overridden/],
    ["an unknown bucket", { bucket: "nope" }, /can't be overridden/],
    ["a missing limit", { limit: "" }, /Enter a limit/],
    ["a fractional limit", { limit: "1.5" }, /whole number/],
    ["a zero burst", { burst: "0" }, /whole number/],
    ["a bad period", { period: "1 week" }, /period such as/],
    ["a period too long for the column", { period: "30d" }, /24 days/],
    ["a missing reason", { reason: " " }, /reason/],
    ["an organization id of another kind", { organizationId: newId("user") }, /not found/],
  ] as const) {
    test(`refuses ${name}`, async () => {
      const result = await actions.setRateLimitOverrideAction(null, form(fields));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(error);
      expect(changeRateLimitOverride).not.toHaveBeenCalled();
    });
  }

  test("resets with an optional reason", async () => {
    expect(await actions.resetRateLimitOverrideAction(null, form({ reason: "" }))).toEqual({
      ok: true,
      data: null,
    });
    expect(changeRateLimitOverride).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "email.recipients.day", rule: null, reason: null }),
    );
    expect((await actions.resetRateLimitOverrideAction(null, form({ bucket: "x" }))).ok).toBe(
      false,
    );
  });
});

const { suspendOrganization, planOrganizationTakedown, revokeApiKeyAsAdmin } = (await import(
  "@coss/tenancy/admin"
)) as unknown as Record<
  "suspendOrganization" | "planOrganizationTakedown" | "revokeApiKeyAsAdmin",
  ReturnType<typeof mock>
>;
const reputation = await import(
  "../src/app/admin/organizations/[organizationId]/reputation/actions"
);

describe("COSS's own organization", () => {
  function form(organizationId: string) {
    const data = new FormData();
    data.set("organizationId", organizationId);
    data.set("reason", "Phishing");
    data.set("note", "Phishing");
    return data;
  }

  beforeEach(() => {
    suspendOrganization.mockClear();
    suspendSending.mockClear();
  });

  test("can't be suspended by an admin", async () => {
    for (const action of [
      actions.suspendOrganizationAction,
      reputation.suspendOrganizationAction,
      actions.takeDownOrganizationAction,
    ]) {
      expect(await action(null, form(systemOrgId))).toEqual({
        ok: false,
        error: SYSTEM_ORGANIZATION_MESSAGE,
      });
    }
    expect(suspendOrganization).not.toHaveBeenCalled();
    expect(suspendSending).not.toHaveBeenCalled();
  });

  test("other organizations still can", async () => {
    const organizationId = newId("org");
    expect((await actions.suspendOrganizationAction(null, form(organizationId))).ok).toBe(true);
    expect((await reputation.suspendOrganizationAction(null, form(organizationId))).ok).toBe(true);
    expect(suspendOrganization).toHaveBeenCalledTimes(1);
    expect(suspendSending).toHaveBeenCalledTimes(1);
  });
});

describe("take down", () => {
  const organizationId = newId("org");
  const loner = newId("user");
  const twoOrgs = newId("user");
  function form(reason: string) {
    const data = new FormData();
    data.set("organizationId", organizationId);
    data.set("reason", reason);
    return data;
  }
  function plan(overrides: Record<string, unknown> = {}) {
    return {
      suspended: false,
      deleting: false,
      apiKeys: [{ id: "key_1" }, { id: "key_2" }],
      members: [
        { userId: loner, email: "spam@x.test", role: "owner", keptBecause: null },
        { userId: twoOrgs, email: "dev@x.test", role: "member", keptBecause: "also in Acme" },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    suspendOrganization.mockClear();
    revokeApiKeyAsAdmin.mockClear();
    mutate.mockClear();
    audit.mockClear();
  });

  test("suspends, revokes every key and bans only the members it should", async () => {
    planOrganizationTakedown.mockImplementation(async () => plan());
    expect((await actions.takeDownOrganizationAction(null, form(" "))).ok).toBe(false);
    expect(planOrganizationTakedown).not.toHaveBeenCalled();

    expect(await actions.takeDownOrganizationAction(null, form("Phishing"))).toEqual({
      ok: true,
      data: null,
    });
    expect(suspendOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId, reason: "Phishing" }),
    );
    expect(revokeApiKeyAsAdmin.mock.calls.map(([input]) => input.keyId)).toEqual([
      "key_1",
      "key_2",
    ]);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: loner, banReason: "Phishing" } }),
    );
    expect(audit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "organization.take_down",
        reason: "Phishing",
        metadata: {
          bannedUserIds: [loner],
          keptUserIds: [twoOrgs],
          revokedKeyIds: ["key_1", "key_2"],
        },
      }),
    );
  });

  test("skips the suspension when it is already in place, and refuses a deleting org", async () => {
    planOrganizationTakedown.mockImplementation(async () => plan({ suspended: true }));
    expect((await actions.takeDownOrganizationAction(null, form("Spam"))).ok).toBe(true);
    expect(suspendOrganization).not.toHaveBeenCalled();

    planOrganizationTakedown.mockImplementation(async () => plan({ deleting: true }));
    expect((await actions.takeDownOrganizationAction(null, form("Spam"))).ok).toBe(false);
    expect(revokeApiKeyAsAdmin).toHaveBeenCalledTimes(2);
  });
});

const emails = await import("../src/app/admin/emails/actions");

describe("email content", () => {
  beforeEach(() => {
    audit.mockClear();
    emailContent.mockClear();
  });

  test("returns the content and records the view", async () => {
    const data = new FormData();
    data.set("emailId", newId("email"));
    expect(await emails.revealEmailContentAction(null, data)).toEqual({
      ok: true,
      data: { html: "<p>Win</p>", text: "Win" },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "email.view_content",
        target: { type: "email", id: data.get("emailId") },
        organizationId: emailContext.organizationId,
      }),
    );
  });

  test("refuses anything but an email id, without recording a view", async () => {
    const data = new FormData();
    data.set("emailId", newId("user"));
    expect((await emails.revealEmailContentAction(null, data)).ok).toBe(false);
    expect(emailContent).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});
