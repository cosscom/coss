import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { AccountDeletionResponse, MobileErrorBody } from "@coss/companion";

mock.module("server-only", () => ({}));
mock.module("@sentry/nextjs", () => ({ setTag: () => {}, setUser: () => {} }));

const TOKEN = "good-token";
const FRESH_AGE_S = 60 * 60 * 24;
let sessionCreatedAt = new Date();
mock.module("@coss/auth", () => ({
  auth: {
    $context: Promise.resolve({ sessionConfig: { freshAge: FRESH_AGE_S } }),
    api: {
      getSession: async () => ({
        user: { id: "user_1", name: "Ada", email: "ada@example.com" },
        session: {
          id: "session_1",
          createdAt: sessionCreatedAt,
          ssoProviderId: null,
          impersonatedBy: null,
        },
      }),
    },
  },
}));
mock.module("@coss/auth/mobile", () => ({
  mobileSessionHeaders: async (token: string) =>
    token === TOKEN ? new Headers({ cookie: `session=${token}` }) : null,
}));
mock.module("@/lib/rate-limit-runtime", () => ({
  rateLimitRuntime: () => ({
    clientIp: () => "203.0.113.9",
    limiter: { consume: async () => ({ allowed: true, retryAfterMs: 0 }) },
  }),
}));

const acme = { id: "org_1", name: "Acme", slug: "acme" };
const shared = { id: "org_2", name: "Shared", slug: "shared" };
let blockers: unknown[] = [];
let unpaid = 0;
const deleteUserAccount = mock(async (_input: unknown) => ({
  deletedOrganizations: [acme],
  leftOrganizations: [shared],
  revokedKeys: [{ organizationId: "org_2", id: "key_1", name: "personal" }],
}));
const tenancyModule = await import("@coss/tenancy");
mock.module("@coss/tenancy", () => ({
  ...tenancyModule,
  planAccountDeletion: async () => ({
    deleteOrganizations: [acme],
    leaveOrganizations: [shared],
    blockers: [...blockers],
  }),
  deleteUserAccount,
}));
mock.module("@coss/billing", () => ({ unpaidInvoiceCount: async () => unpaid }));
const recordUserAudit = mock(async (_actor: unknown, _input: unknown) => {});
mock.module("@/lib/audit", () => ({ recordUserAudit }));

const route = await import("../src/app/api/mobile/v1/account/deletion/route");

function request(method: "GET" | "POST", body?: unknown): Request {
  return new Request("http://localhost/api/mobile/v1/account/deletion", {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function errorCode(response: Response): Promise<string> {
  return ((await response.json()) as MobileErrorBody).error.code;
}

beforeEach(() => {
  sessionCreatedAt = new Date();
  blockers = [];
  unpaid = 0;
  deleteUserAccount.mockClear();
  recordUserAudit.mockClear();
});

describe("GET /account/deletion", () => {
  test("describes what deleting the account does", async () => {
    const response = await route.GET(request("GET"), undefined);
    expect(response.status).toBe(200);
    expect((await response.json()) as AccountDeletionResponse).toEqual({
      delete_organizations: [{ name: "Acme", slug: "acme" }],
      leave_organizations: [{ name: "Shared", slug: "shared" }],
      blockers: [],
    });
  });

  test("names what blocks it, including open invoices of organizations it would delete", async () => {
    blockers = [{ kind: "sole_owner", organization: shared }];
    unpaid = 1;
    const body = (await (
      await route.GET(request("GET"), undefined)
    ).json()) as AccountDeletionResponse;
    expect(body.blockers).toEqual([
      "You're the only owner of Shared. Make another member an owner, or delete the organization, first.",
      "Acme has open invoices to settle first. Contact support if you need help.",
    ]);
  });
});

describe("POST /account/deletion", () => {
  test("needs the email address typed to confirm", async () => {
    const response = await route.POST(
      request("POST", { confirm: "someone@example.com" }),
      undefined,
    );
    expect(response.status).toBe(400);
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  test("needs a recent sign-in", async () => {
    sessionCreatedAt = new Date(Date.now() - (FRESH_AGE_S + 60) * 1000);
    const response = await route.POST(request("POST", { confirm: "ada@example.com" }), undefined);
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("reauthentication_required");
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  test("refuses while something blocks it", async () => {
    blockers = [{ kind: "platform_admin" }];
    const response = await route.POST(request("POST", { confirm: "ada@example.com" }), undefined);
    expect(response.status).toBe(409);
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  test("deletes the account and records it in the organizations it leaves", async () => {
    const response = await route.POST(request("POST", { confirm: " ADA@example.com " }), undefined);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(deleteUserAccount).toHaveBeenCalledWith({ userId: "user_1", email: "ada@example.com" });
    expect(recordUserAudit.mock.calls.map(([, input]) => input)).toEqual([
      expect.objectContaining({ organizationId: "org_2", action: "member.left" }),
      expect.objectContaining({ organizationId: "org_2", action: "api_key.revoked" }),
    ]);
  });
});
