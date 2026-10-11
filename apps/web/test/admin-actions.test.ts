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
  recordAdminAction: audit,
  resetUserTwoFactor: mock(async () => {}),
  revokeApiKeyAsAdmin: mock(),
  suspendOrganization: mock(),
  unsuspendOrganization: mock(),
}));
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
  }),
}));
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
const { resetUserTwoFactor } = (await import("@coss/tenancy/admin")) as unknown as {
  resetUserTwoFactor: ReturnType<typeof mock>;
};
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
