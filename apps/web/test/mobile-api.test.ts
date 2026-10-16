import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { MobileErrorBody } from "@coss/companion";

mock.module("server-only", () => ({}));
mock.module("@sentry/nextjs", () => ({ setTag: () => {}, setUser: () => {} }));

const GOOD_TOKEN = "good-token";
const user = {
  id: "user_1",
  name: "Ada",
  email: "ada@example.com",
  image: null,
  twoFactorEnabled: false,
};
let sessionFields: { ssoProviderId: string | null; impersonatedBy: string | null } = {
  ssoProviderId: null,
  impersonatedBy: null,
};
const seenHeaders: Headers[] = [];
mock.module("@coss/auth", () => ({
  auth: {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        seenHeaders.push(headers);
        return headers.get("cookie") === `session=${GOOD_TOKEN}`
          ? { user, session: { id: "session_1", ...sessionFields } }
          : null;
      },
    },
  },
}));
const exchange = mock(async (): Promise<{ token: string; userId: string } | null> => null);
mock.module("@coss/auth/mobile", () => ({
  exchangeMobileAuthorizationCode: exchange,
  mobileSessionHeaders: async (token: string) =>
    token === GOOD_TOKEN ? new Headers({ cookie: `session=${token}` }) : null,
  revokeMobileSession: async (token: string) => token === GOOD_TOKEN,
}));

type Membership = {
  organization: {
    id: string;
    name: string;
    slug: string;
    requireSso: boolean;
    requireTwoFactor: boolean;
  };
  member: { role: string };
  suspended: boolean;
  ssoProviderId: string | null;
};
let membership: Membership | null = null;
mock.module("@coss/tenancy", () => ({
  getMembership: async () => membership,
  getEnvironment: async () => null,
  listUserOrganizations: async () => [{ name: "Acme", slug: "acme", role: "owner" }],
  listProjectsWithEnvironments: async () => [
    {
      project: { id: "proj_1", name: "Default", slug: "default" },
      environments: [{ id: "env_1", name: "Production", slug: "production", mode: "live" }],
    },
  ],
}));
const reputationModule = await import("@coss/reputation");
mock.module("@coss/reputation", () => ({
  ...reputationModule,
  getReputationStanding: async () => null,
  listReputationEvents: async () => [
    {
      id: "repev_2",
      type: "policy_updated",
      trigger: "admin",
      actor: "admin",
      note: "internal",
      actorEmail: "admin@coss.com",
      createdAt: new Date("2026-10-02T00:00:00Z"),
    },
    {
      id: "repev_1",
      type: "warning_raised",
      trigger: "bounce_rate",
      actor: "system",
      note: null,
      actorEmail: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
    },
  ],
}));
mock.module("@coss/email", () => ({
  getEmailTenant: async () => ({ sendingStatus: "enabled" }),
}));
const billingBannerState = mock(async () => ({ held: null, pastDue: true, allowance: null }));
mock.module("@/lib/billing", () => ({ billingBannerState }));
let allowed = true;
mock.module("@/lib/rate-limit-runtime", () => ({
  rateLimitRuntime: () => ({
    clientIp: () => "203.0.113.9",
    limiter: { consume: async () => ({ allowed, retryAfterMs: allowed ? 0 : 12_000 }) },
  }),
}));

const me = await import("../src/app/api/mobile/v1/me/route");
const org = await import("../src/app/api/mobile/v1/orgs/[orgSlug]/route");
const reputation = await import("../src/app/api/mobile/v1/orgs/[orgSlug]/reputation/route");
const token = await import("../src/app/api/mobile/v1/auth/token/route");
const signOut = await import("../src/app/api/mobile/v1/auth/sign-out/route");

function request(path: string, init: RequestInit & { bearer?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.bearer) headers.set("authorization", `Bearer ${init.bearer}`);
  return new Request(`http://localhost:3000${path}`, { ...init, headers });
}

function orgContext(orgSlug = "acme") {
  return { params: Promise.resolve({ orgSlug }) };
}

async function errorOf(response: Response) {
  return ((await response.json()) as MobileErrorBody).error;
}

function member(role = "member", organization: Partial<Membership["organization"]> = {}) {
  return {
    organization: {
      id: "org_1",
      name: "Acme",
      slug: "acme",
      requireSso: false,
      requireTwoFactor: false,
      ...organization,
    },
    member: { role },
    suspended: false,
    ssoProviderId: "sso_acme",
  };
}

beforeEach(() => {
  membership = member();
  sessionFields = { ssoProviderId: null, impersonatedBy: null };
  allowed = true;
  seenHeaders.length = 0;
  exchange.mockClear();
});

describe("mobile API sessions", () => {
  test("a bearer token is required; dashboard cookies never authenticate", async () => {
    const response = await me.GET(
      request("/api/mobile/v1/me", { headers: { cookie: `session=${GOOD_TOKEN}` } }),
      undefined,
    );
    expect(response.status).toBe(401);
    expect((await errorOf(response)).code).toBe("unauthorized");
    expect(seenHeaders).toHaveLength(0);
  });

  test("returns the user and their organizations, uncached", async () => {
    const response = await me.GET(request("/api/mobile/v1/me", { bearer: GOOD_TOKEN }), undefined);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      user: {
        id: "user_1",
        name: "Ada",
        email: "ada@example.com",
        image: null,
        two_factor_enabled: false,
      },
      organizations: [{ name: "Acme", slug: "acme", role: "owner" }],
    });
  });

  test("rate limited per user", async () => {
    allowed = false;
    const response = await me.GET(request("/api/mobile/v1/me", { bearer: GOOD_TOKEN }), undefined);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
  });
});

describe("mobile organization access", () => {
  test("non-members get a 404", async () => {
    membership = null;
    const response = await org.GET(
      request("/api/mobile/v1/orgs/acme", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    expect(response.status).toBe(404);
  });

  test("an SSO requirement names the dashboard page that resolves it", async () => {
    membership = member("member", { requireSso: true });
    const response = await org.GET(
      request("/api/mobile/v1/orgs/acme", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toMatchObject({ code: "sso_required", url: "/sso?org=acme" });
  });

  test("an SSO session from the organization's provider satisfies both requirements", async () => {
    membership = member("member", { requireSso: true, requireTwoFactor: true });
    sessionFields.ssoProviderId = "sso_acme";
    const response = await org.GET(
      request("/api/mobile/v1/orgs/acme", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    expect(response.status).toBe(200);
  });

  test("a two-factor requirement without two-factor is refused", async () => {
    membership = member("admin", { requireTwoFactor: true });
    const response = await org.GET(
      request("/api/mobile/v1/orgs/acme", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    expect(response.status).toBe(403);
    expect(await errorOf(response)).toMatchObject({
      code: "two_factor_required",
      url: "/settings/security",
    });
  });

  test("billing alerts only for members who may read billing", async () => {
    const asMember = await org.GET(
      request("/api/mobile/v1/orgs/acme", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    const body = await asMember.json();
    expect(body.billing).toBeNull();
    expect(body.can).toEqual({
      read_email: true,
      read_reputation: true,
      read_billing: false,
      read_domain: true,
      read_audit: false,
      read_webhook: true,
      read_risk: true,
      read_log: true,
      read_suppression: true,
      read_api_key: true,
      read_hook: true,
      read_log_drain: true,
      read_risk_rule: true,
      read_risk_list: true,
      read_environment: true,
    });
    expect(body.projects[0].environments[0]).toEqual({
      id: "env_1",
      name: "Production",
      slug: "production",
      mode: "live",
    });
    expect(billingBannerState).not.toHaveBeenCalled();

    membership = member("owner");
    const asOwner = await (
      await org.GET(request("/api/mobile/v1/orgs/acme", { bearer: GOOD_TOKEN }), orgContext())
    ).json();
    expect(asOwner.billing).toEqual({ held: null, past_due: true, allowance: null });
  });

  test("reputation history hides policy changes and who acted", async () => {
    const response = await reputation.GET(
      request("/api/mobile/v1/orgs/acme/reputation", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    const body = await response.json();
    expect(body.standing.status).toBe("good");
    expect(body.sending_paused).toBe(false);
    expect(body.events).toEqual([
      {
        id: "repev_1",
        type: "warning_raised",
        trigger: "bounce_rate",
        trigger_label: reputationModule.triggerLabel("bounce_rate"),
        actor: "automatic",
        created_at: "2026-10-01T00:00:00.000Z",
      },
    ]);
  });

  test("roles without the permission get a 403", async () => {
    membership = member("guest");
    const response = await reputation.GET(
      request("/api/mobile/v1/orgs/acme/reputation", { bearer: GOOD_TOKEN }),
      orgContext(),
    );
    expect(response.status).toBe(403);
    expect((await errorOf(response)).code).toBe("forbidden");
  });
});

describe("mobile token exchange", () => {
  const post = (body: unknown) =>
    token.POST(
      request("/api/mobile/v1/auth/token", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", "user-agent": "COSS-iOS/1.0" },
      }),
      undefined,
    );

  test("malformed requests are refused before any lookup", async () => {
    const response = await post({ code: 1 });
    expect(response.status).toBe(400);
    expect((await errorOf(response)).code).toBe("invalid_request");
    expect(exchange).not.toHaveBeenCalled();
  });

  test("rate limited per client IP before the code is looked up", async () => {
    allowed = false;
    const response = await post({ code: "c", code_verifier: "v" });
    expect(response.status).toBe(429);
    expect(exchange).not.toHaveBeenCalled();
  });

  test("an unknown code is an invalid grant", async () => {
    const response = await post({ code: "c", code_verifier: "v" });
    expect(response.status).toBe(400);
    expect((await errorOf(response)).code).toBe("invalid_grant");
    expect(exchange).toHaveBeenCalledWith({
      code: "c",
      codeVerifier: "v",
      ipAddress: "203.0.113.9",
      userAgent: "COSS-iOS/1.0",
    });
  });

  test("a valid code returns the token and its user", async () => {
    exchange.mockImplementationOnce(async () => ({ token: GOOD_TOKEN, userId: "user_1" }));
    const response = await post({ code: "c", code_verifier: "v" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBe(GOOD_TOKEN);
    expect(body.user.email).toBe("ada@example.com");
  });

  test("sign-out revokes the token's session", async () => {
    const ok = await signOut.POST(
      request("/api/mobile/v1/auth/sign-out", { method: "POST", bearer: GOOD_TOKEN }),
      undefined,
    );
    expect(ok.status).toBe(200);
    const bad = await signOut.POST(
      request("/api/mobile/v1/auth/sign-out", { method: "POST", bearer: "forged" }),
      undefined,
    );
    expect(bad.status).toBe(401);
  });
});
