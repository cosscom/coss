import { beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  ApiKeysResponse,
  BudgetsResponse,
  MemberSpendResponse,
  MobileErrorBody,
  OrganizationSpendResponse,
} from "@coss/companion";

// The iOS app's Spend and Budgets pages, and API keys' owners and budget pauses. The real
// `spendOverview` and `evaluateBudgets` run over mocked rows.

mock.module("server-only", () => ({}));
mock.module("@sentry/nextjs", () => ({ setTag: () => {}, setUser: () => {} }));

const GOOD_TOKEN = "good-token";
let userId = "user_1";
mock.module("@coss/auth", () => ({
  auth: {
    api: {
      getSession: async ({ headers }: { headers: Headers }) =>
        headers.get("cookie") === `session=${GOOD_TOKEN}`
          ? {
              user: { id: userId, name: "Ada", email: "ada@example.com", image: null },
              session: { id: "session_1", ssoProviderId: null, impersonatedBy: null },
            }
          : null,
    },
  },
}));
mock.module("@coss/auth/mobile", () => ({
  mobileSessionHeaders: async (token: string) =>
    token === GOOD_TOKEN ? new Headers({ cookie: `session=${token}` }) : null,
}));
mock.module("@/lib/rate-limit-runtime", () => ({
  rateLimitRuntime: () => ({
    clientIp: () => "203.0.113.9",
    limiter: { consume: async () => ({ allowed: true, retryAfterMs: 0 }) },
  }),
}));

const ORG_ID = "org_1";
let role = "owner";
let environmentMode: "live" | "sandbox" = "live";
const reads: string[] = [];

const tenancyModule = await import("@coss/tenancy");
mock.module("@coss/tenancy", () => ({
  ...tenancyModule,
  getMembership: async () => ({
    organization: { id: ORG_ID, name: "Acme", slug: "acme", requireSso: false },
    member: { role },
    suspended: false,
    ssoProviderId: null,
  }),
  getEnvironment: async () => ({
    project: { id: "proj_1", name: "Default", slug: "default" },
    environment: {
      id: "env_live",
      name: "Production",
      slug: "production",
      mode: environmentMode,
      personalKeys: true,
    },
  }),
  listOrganizationMembers: async ({ organizationId }: { organizationId: string }) => {
    reads.push(`members:${organizationId}`);
    return [
      { role: "owner", user: { id: "user_1", name: "Ada", email: "ada@example.com" } },
      { role: "member", user: { id: "user_2", name: "Bob", email: "bob@example.com" } },
    ];
  },
  listProjectsWithEnvironments: async () => [
    {
      project: { id: "proj_1", name: "Default" },
      environments: [
        { id: "env_live", name: "Production", mode: "live" },
        { id: "env_sandbox", name: "Development", mode: "sandbox" },
      ],
    },
  ],
  listOrganizationApiKeys: async () => [
    {
      id: "key_org",
      name: "Server",
      start: "coss_live_ab",
      environmentId: "env_live",
      projectId: "proj_1",
      ownerUserId: null,
    },
    {
      id: "key_bob",
      name: "Bob's laptop",
      start: "coss_live_cd",
      environmentId: "env_live",
      projectId: "proj_1",
      ownerUserId: "user_2",
    },
  ],
  listEnvironmentApiKeys: async (scope: { organizationId: string; environmentId: string }) => {
    reads.push(`keys:${scope.organizationId}:${scope.environmentId}`);
    const key = {
      start: "coss_live_ab",
      enabled: true,
      lastRequest: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      createdByUserId: "user_1",
      access: "full",
      permissions: { email: ["send"] },
    };
    return [
      { ...key, id: "key_org", name: "Server", owner: null },
      {
        ...key,
        id: "key_bob",
        name: "Bob's laptop",
        owner: { id: "user_2", name: "Bob", email: "bob@example.com", role: "member" },
      },
      {
        ...key,
        id: "key_gone",
        name: "Old",
        owner: { id: "user_3", name: "", email: "cy@example.com", role: null },
      },
    ];
  },
}));

const PERIOD = { start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-11-01T00:00:00Z") };
const line = (fields: {
  day: string;
  userId: string;
  apiKeyId: string;
  quantity: number;
  cents: bigint;
}) => ({
  projectId: "proj_1",
  environmentId: "env_live",
  meter: "email.recipients",
  dimension: "",
  ...fields,
  day: new Date(`${fields.day}T00:00:00Z`),
});
const budget = (fields: Record<string, unknown>) => ({
  id: `budget_${fields.scope}`,
  organizationId: ORG_ID,
  userId: null,
  projectId: null,
  apiKeyId: null,
  alertThresholds: [80, 100],
  ...fields,
});
let holds: { scope: string; targetId: string }[] = [];
const billingModule = await import("@coss/billing");
mock.module("@coss/billing", () => ({
  ...billingModule,
  spendBreakdown: async (organizationId: string) => {
    reads.push(`spend:${organizationId}`);
    return {
      period: PERIOD,
      estimate: {},
      totalCents: 1000n,
      lines: [
        line({ day: "2026-10-01", userId: "", apiKeyId: "key_org", quantity: 1000, cents: 600n }),
        line({
          day: "2026-10-02",
          userId: "user_2",
          apiKeyId: "key_bob",
          quantity: 500,
          cents: 400n,
        }),
      ],
    };
  },
  listBudgets: async () => [
    budget({ scope: "member_default", amountCents: 300n }),
    budget({ scope: "api_key", apiKeyId: "key_org", amountCents: 1000n }),
  ],
  listBudgetHolds: async (organizationId: string) => {
    reads.push(`holds:${organizationId}`);
    return holds;
  },
  getBillingAccount: async () => ({ spendLimitCents: 5000n }),
}));

const spend = await import("../src/app/api/mobile/v1/orgs/[orgSlug]/spend/route");
const budgets = await import("../src/app/api/mobile/v1/orgs/[orgSlug]/spend/budgets/route");
const apiKeys = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/api-keys/route"
);

beforeEach(() => {
  userId = "user_1";
  role = "owner";
  environmentMode = "live";
  holds = [{ scope: "user", targetId: "user_2" }];
  reads.length = 0;
});

function request(path: string): Request {
  return new Request(`http://localhost:3000/api/mobile/v1${path}`, {
    headers: { authorization: `Bearer ${GOOD_TOKEN}` },
  });
}

const orgParams = { params: Promise.resolve({ orgSlug: "acme" }) };
const envParams = {
  params: Promise.resolve({ orgSlug: "acme", projectSlug: "default", envSlug: "production" }),
};

describe("mobile spend", () => {
  test("billing readers see the organization's spend, split and budgeted like the dashboard", async () => {
    const response = await spend.GET(request("/orgs/acme/spend"), orgParams);
    expect(response.status).toBe(200);
    const body = (await response.json()) as OrganizationSpendResponse;
    expect(body).toMatchObject({
      view: "organization",
      total: 1000,
      organization: 600,
      personal: 400,
      spend_limit: 5000,
      paused: ["Bob"],
    });
    expect(body.days.slice(0, 2)).toEqual([
      { date: "2026-10-01", organization: 600, personal: 0 },
      { date: "2026-10-02", organization: 0, personal: 400 },
    ]);
    expect(body.breakdown.member).toEqual([
      {
        id: "",
        label: "Organization keys and the dashboard",
        detail: null,
        email_recipients: 1000,
        spent: 600,
        share: 60,
        budget: null,
        paused: false,
      },
      {
        id: "user_2",
        label: "Bob",
        detail: "bob@example.com",
        email_recipients: 500,
        spent: 400,
        share: 40,
        budget: { applies: true, amount: 300, spent: 400, from_default: true },
        paused: true,
      },
    ]);
    // Environments have no budgets.
    expect(body.breakdown.environment.map((row) => [row.label, row.budget])).toEqual([
      ["Default · Production", null],
    ]);
    expect(body.breakdown.key.find((row) => row.id === "key_bob")?.detail).toBe(
      "Default · Production · Bob's personal key",
    );
    expect(body.breakdown.key.find((row) => row.id === "key_org")?.budget).toEqual({
      applies: true,
      amount: 1000,
      spent: 600,
      from_default: false,
    });
    expect(reads).toContain(`spend:${ORG_ID}`);
  });

  test("other members see their personal keys' spend only", async () => {
    role = "member";
    userId = "user_2";
    const response = await spend.GET(request("/orgs/acme/spend"), orgParams);
    const body = (await response.json()) as MemberSpendResponse;
    expect(body).toMatchObject({
      view: "member",
      total: 400,
      budget: { applies: true, amount: 300, spent: 400, from_default: true },
      remaining: 0,
      over_budget: true,
    });
    expect(body.keys).toEqual([
      {
        id: "key_bob",
        label: "Bob's laptop",
        detail: "Default · Production",
        email_recipients: 500,
        spent: 400,
        share: null,
        budget: null,
        paused: false,
      },
    ]);
    expect(body.days.slice(0, 2).map((day) => day.personal)).toEqual([0, 400]);
    expect("breakdown" in body).toBe(false);
  });

  test("a member without spend still sees the default budget", async () => {
    role = "member";
    userId = "user_9";
    const body = (await (
      await spend.GET(request("/orgs/acme/spend"), orgParams)
    ).json()) as MemberSpendResponse;
    expect(body).toMatchObject({
      total: 0,
      budget: { applies: true, amount: 300, spent: 0, from_default: true },
      remaining: 300,
      over_budget: false,
      keys: [],
    });
  });
});

describe("mobile budgets", () => {
  test("lists members, projects and key budgets", async () => {
    const response = await budgets.GET(request("/orgs/acme/spend/budgets"), orgParams);
    expect(response.status).toBe(200);
    const body = (await response.json()) as BudgetsResponse;
    expect(body.member_default).toBe(300);
    expect(body.members).toEqual([
      {
        user_id: "user_1",
        name: "Ada",
        email: "ada@example.com",
        role: "owner",
        budget: { applies: true, amount: 300, spent: 0, from_default: true },
        own: false,
        paused: false,
      },
      {
        user_id: "user_2",
        name: "Bob",
        email: "bob@example.com",
        role: "member",
        budget: { applies: true, amount: 300, spent: 400, from_default: true },
        own: false,
        paused: true,
      },
    ]);
    expect(body.projects).toEqual([
      {
        id: "proj_1",
        name: "Default",
        budget: { applies: false, amount: null, spent: 0, from_default: false },
        paused: false,
      },
    ]);
    expect(body.keys).toEqual([
      {
        api_key_id: "key_org",
        label: "Server",
        detail: "Default · Production",
        budget: { applies: true, amount: 1000, spent: 600, from_default: false },
        paused: false,
      },
    ]);
  });

  test("members who can't read billing get a 403", async () => {
    role = "member";
    const response = await budgets.GET(request("/orgs/acme/spend/budgets"), orgParams);
    expect(response.status).toBe(403);
    expect(((await response.json()) as MobileErrorBody).error.code).toBe("forbidden");
  });
});

describe("mobile API keys", () => {
  test("carry their owner and whether a used-up budget pauses them", async () => {
    holds = [{ scope: "user", targetId: "user_2" }];
    const response = await apiKeys.GET(
      request("/orgs/acme/projects/default/environments/production/api-keys"),
      envParams,
    );
    const body = (await response.json()) as ApiKeysResponse;
    expect(body.personal_keys).toBe(true);
    expect(body.data.map((key) => [key.id, key.owner?.id ?? null, key.paused])).toEqual([
      ["key_org", null, false],
      ["key_bob", "user_2", true],
      ["key_gone", "user_3", false],
    ]);
    expect(body.data[2]?.owner).toEqual({
      id: "user_3",
      name: "",
      email: "cy@example.com",
      role: null,
    });
    expect(reads).toContain(`holds:${ORG_ID}`);
  });

  test("a project's used-up budget pauses every key in it", async () => {
    holds = [{ scope: "project", targetId: "proj_1" }];
    const body = (await (
      await apiKeys.GET(
        request("/orgs/acme/projects/default/environments/production/api-keys"),
        envParams,
      )
    ).json()) as ApiKeysResponse;
    expect(body.data.every((key) => key.paused)).toBe(true);
  });

  test("sandbox keys are never paused (and holds aren't read)", async () => {
    environmentMode = "sandbox";
    holds = [{ scope: "project", targetId: "proj_1" }];
    const body = (await (
      await apiKeys.GET(
        request("/orgs/acme/projects/default/environments/production/api-keys"),
        envParams,
      )
    ).json()) as ApiKeysResponse;
    expect(body.data.some((key) => key.paused)).toBe(false);
    expect(reads).not.toContain(`holds:${ORG_ID}`);
  });
});
