import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { MobileErrorBody } from "@coss/companion";

mock.module("server-only", () => ({}));
mock.module("@sentry/nextjs", () => ({ setTag: () => {}, setUser: () => {} }));

const TOKEN = "good-token";
mock.module("@coss/auth", () => ({
  auth: {
    api: {
      getSession: async () => ({
        user: { id: "user_1", name: "Ada", email: "ada@example.com", twoFactorEnabled: false },
        session: { id: "session_1", ssoProviderId: null, impersonatedBy: null },
      }),
    },
  },
}));
mock.module("@coss/auth/mobile", () => ({
  mobileSessionHeaders: async (token: string) =>
    token === TOKEN ? new Headers({ cookie: `session=${token}` }) : null,
}));

let role = "owner";
let suspended = false;
const tenancyModule = await import("@coss/tenancy");
mock.module("@coss/tenancy", () => ({
  ...tenancyModule,
  getMembership: async () => ({
    organization: {
      id: "org_1",
      name: "Acme",
      slug: "acme",
      requireSso: false,
      requireTwoFactor: false,
    },
    member: { role },
    suspended,
    ssoProviderId: null,
  }),
  getEnvironment: async () => ({
    project: { id: "proj_1", name: "Default", slug: "default" },
    environment: { id: "env_1", name: "Production", slug: "production", mode: "live" },
  }),
}));

type Env = { organizationId: string; environmentId: string };

const STATS = {
  recipients: 120,
  sent: 118,
  delivered: 100,
  bounced: 2,
  complained: 1,
  failed: 2,
  opened: 40,
  clicked: 10,
  unsubscribed: 3,
};
let broadcast = {
  object: "broadcast" as const,
  id: "bcast_1",
  name: "October news",
  status: "sending" as
    | "draft"
    | "scheduled"
    | "sending"
    | "paused"
    | "sent"
    | "canceled"
    | "failed",
  audience_id: "aud_1" as string | null,
  segment_id: null as string | null,
  topic: "news" as string | null,
  from: "Acme <news@acme.com>",
  reply_to: ["hello@acme.com"],
  subject: "News for {{{contact.first_name|you}}}",
  preview_text: "What's new" as string | null,
  html: "<p>Hi</p>" as string | null,
  text: "Hi {{{contact.first_name|there}}}" as string | null,
  tracking: { opens: true, clicks: false },
  rate_per_second: null as number | null,
  scheduled_at: null as string | null,
  started_at: "2026-10-01T00:00:00.000Z" as string | null,
  completed_at: null as string | null,
  canceled_at: null as string | null,
  recipients_estimated: 130 as number | null,
  pause_reason: "usage_limit" as string | null,
  error: null as { code: string; message: string } | null,
  stats: STATS,
  created_at: "2026-09-30T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};
const BASE_BROADCAST = { ...broadcast };
// The environment the broadcast belongs to: the package functions scope by it.
let broadcastEnvironment = "env_1";
const own = (env: Env, id: string) =>
  env.organizationId === "org_1" && env.environmentId === broadcastEnvironment && id === "bcast_1";

let mailingAddress: string | null = "Acme Inc.\n1 Main St";
const countRecipients = mock(async (..._args: unknown[]) => 512);
const listBroadcasts = mock(async (env: Env, _query: { limit?: number; after?: string }) => ({
  object: "list" as const,
  data: env.environmentId === broadcastEnvironment ? [broadcast] : [],
  has_more: true,
}));
const pauseBroadcast = mock(async (env: Env, id: string, _opts: unknown) =>
  own(env, id) ? { ...broadcast, status: "paused" as const, pause_reason: "paused" } : null,
);
const cancelBroadcast = mock(async (env: Env, id: string, _opts: unknown) =>
  own(env, id) ? { ...broadcast, status: "canceled" as const } : null,
);
const resumeBroadcast = mock(async (env: Env, id: string, _opts: unknown) =>
  own(env, id) ? { ...broadcast, status: "sending" as const, pause_reason: null } : null,
);
const emailModule = await import("@coss/email");
mock.module("@coss/email", () => ({
  ...emailModule,
  listBroadcasts,
  getBroadcast: async (env: Env, id: string) => (own(env, id) ? broadcast : null),
  getMarketingSettingsRow: async () =>
    mailingAddress === null
      ? null
      : {
          id: "mkt_1",
          organizationId: "org_1",
          environmentId: "env_1",
          displayName: "Acme",
          mailingAddress,
          doubleOptInDefault: true,
          confirmationFrom: "Acme <news@acme.com>",
          confirmationSubject: "Confirm",
          confirmationHtml: null,
          confirmationText: "secret-ish text the app doesn't show",
          confirmedRedirectUrl: "https://acme.com/welcome",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
  propertyDefinitions: async () => new Map(),
  getAudience: async (_env: Env, id: string) => ({ id, name: "Customers" }),
  getSegment: async (_env: Env, id: string) => ({ id, name: "Active" }),
  listBroadcastEmails: async () => ({
    object: "list",
    data: [
      {
        id: "email_1",
        to: ["ada@example.com"],
        status: "sent",
        subject: "News for Ada",
        created_at: "2026-10-01T00:00:01.000Z",
      },
    ],
    has_more: false,
  }),
  countRecipients,
  pauseBroadcast,
  cancelBroadcast,
  resumeBroadcast,
}));

mock.module("@/lib/billing", () => ({ planRules: async () => ({}) }));
const usageGate = { gate: true };
mock.module("@/lib/broadcasts", () => ({
  usageGate: async () => usageGate,
  liveProviderName: () => "ses",
}));
const recordAudit = mock(async (_session: unknown, _input: unknown) => {});
mock.module("@/lib/audit", () => ({ recordAudit }));
mock.module("@/lib/rate-limit-runtime", () => ({
  rateLimitRuntime: () => ({
    clientIp: () => "203.0.113.9",
    limiter: { consume: async () => ({ allowed: true, retryAfterMs: 0 }) },
  }),
}));

const ROUTES =
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]";
const list = await import(`${ROUTES}/broadcasts/route`);
const detail = await import(`${ROUTES}/broadcasts/[broadcastId]/route`);
const pause = await import(`${ROUTES}/broadcasts/[broadcastId]/pause/route`);
const resume = await import(`${ROUTES}/broadcasts/[broadcastId]/resume/route`);
const cancel = await import(`${ROUTES}/broadcasts/[broadcastId]/cancel/route`);
const marketing = await import(`${ROUTES}/marketing/route`);

const env = { orgSlug: "acme", projectSlug: "default", envSlug: "production" };
const envContext = { params: Promise.resolve(env) };
const broadcastContext = (broadcastId = "bcast_1") => ({
  params: Promise.resolve({ ...env, broadcastId }),
});

function get(query = ""): Request {
  return new Request(`http://localhost:3000/api/mobile/v1/x${query}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

function post(): Request {
  return new Request("http://localhost:3000/api/mobile/v1/x", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

async function errorOf(response: Response) {
  return ((await response.json()) as MobileErrorBody).error;
}

beforeEach(() => {
  role = "owner";
  suspended = false;
  broadcastEnvironment = "env_1";
  mailingAddress = "Acme Inc.\n1 Main St";
  broadcast = { ...BASE_BROADCAST };
  for (const fn of [
    listBroadcasts,
    pauseBroadcast,
    cancelBroadcast,
    resumeBroadcast,
    countRecipients,
    recordAudit,
  ]) {
    fn.mockClear();
  }
});

describe("broadcasts list", () => {
  test("a page of the environment's broadcasts, in the list's wire shape", async () => {
    const response = await list.GET(get("?after=bcast_9"), envContext);
    expect(response.status).toBe(200);
    expect(listBroadcasts.mock.calls[0]).toEqual([
      { organizationId: "org_1", environmentId: "env_1" },
      { limit: 50, after: "bcast_9" },
    ]);
    expect(await response.json()).toEqual({
      data: [
        {
          id: "bcast_1",
          name: "October news",
          status: "sending",
          stats: { recipients: 120, delivered: 100, opened: 40, clicked: 10 },
          tracking: { opens: true, clicks: false },
          updated_at: "2026-10-01T00:00:00.000Z",
        },
      ],
      next_cursor: "bcast_1",
    });
  });

  test("roles without broadcast:read get a 403", async () => {
    role = "guest";
    const response = await list.GET(get(), envContext);
    expect(response.status).toBe(403);
    expect(listBroadcasts).not.toHaveBeenCalled();
  });
});

describe("a broadcast", () => {
  test("the detail's wire shape: stats, target, preview subject and text, recent emails", async () => {
    const response = await detail.GET(get(), broadcastContext());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      broadcast: {
        id: "bcast_1",
        name: "October news",
        status: "sending",
        target: { type: "audience", id: "aud_1", name: "Customers" },
        topic: "news",
        from: "Acme <news@acme.com>",
        reply_to: ["hello@acme.com"],
        preview_text: "What's new",
        tracking: { opens: true, clicks: false },
        // The plan's default marketing rate (no override).
        rate_per_second: expect.any(Number),
        scheduled_at: null,
        started_at: "2026-10-01T00:00:00.000Z",
        finished_at: null,
        updated_at: "2026-10-01T00:00:00.000Z",
        recipients_estimated: 130,
        pause_reason: "usage_limit",
        error: null,
        stats: STATS,
        reach_estimate: null,
        mailing_address_missing: false,
        preview_subject: "News for you",
        preview_text_body:
          "Hi there\n\n--\nAcme Inc.\n1 Main St\nUnsubscribe: #unsubscribe\nManage preferences: #preferences\n",
        has_html: true,
      },
      recent_emails: [
        {
          id: "email_1",
          to: "ada@example.com",
          status: "sent",
          created_at: "2026-10-01T00:00:01.000Z",
        },
      ],
      can_send: true,
      can_read_email: true,
    });
    expect(countRecipients).not.toHaveBeenCalled();
  });

  test("a draft: its reach now, the missing postal address, no emails", async () => {
    broadcast = { ...BASE_BROADCAST, status: "draft", audience_id: null, segment_id: "seg_1" };
    mailingAddress = null;
    const response = await detail.GET(get(), broadcastContext());
    const body = await response.json();
    expect(body.broadcast).toMatchObject({
      target: { type: "segment", id: "seg_1", name: "Active" },
      reach_estimate: 512,
      mailing_address_missing: true,
    });
    expect(body.recent_emails).toEqual([]);
    expect(countRecipients.mock.calls[0]?.slice(1)).toEqual([
      { segmentId: "seg_1" },
      { topic: "news" },
    ]);
  });

  test("members read it but may not change it", async () => {
    role = "member";
    const body = await (await detail.GET(get(), broadcastContext())).json();
    expect(body.can_send).toBe(false);
  });

  test("another environment's broadcast (or an unknown id) is a 404", async () => {
    broadcastEnvironment = "env_other";
    const response = await detail.GET(get(), broadcastContext());
    expect(response.status).toBe(404);
    expect((await errorOf(response)).code).toBe("not_found");
    broadcastEnvironment = "env_1";
    expect((await detail.GET(get(), broadcastContext("bcast_2"))).status).toBe(404);
  });

  test("roles without broadcast:read get a 403", async () => {
    role = "guest";
    expect((await detail.GET(get(), broadcastContext())).status).toBe(403);
  });
});

describe("pausing, resuming and canceling", () => {
  const scope = { organizationId: "org_1", environmentId: "env_1" };

  test("pause: the dashboard's call and audit event", async () => {
    const response = await pause.POST(post(), broadcastContext());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "paused" });
    expect(pauseBroadcast.mock.calls[0]).toEqual([scope, "bcast_1", { billing: usageGate }]);
    expect(recordAudit).toHaveBeenCalledTimes(1);
    expect(recordAudit.mock.calls[0]?.[1]).toEqual({
      action: "broadcast.paused",
      organizationId: "org_1",
      projectId: "proj_1",
      environmentId: "env_1",
      target: { type: "broadcast", id: "bcast_1", label: "October news" },
    });
  });

  test("resume: with the environment's project and mode, and the live provider", async () => {
    const response = await resume.POST(post(), broadcastContext());
    expect(await response.json()).toEqual({ status: "sending" });
    expect(resumeBroadcast.mock.calls[0] as unknown[]).toEqual([
      { ...scope, projectId: "proj_1", mode: "live" },
      "bcast_1",
      { liveProvider: "ses" },
    ]);
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({ action: "broadcast.resumed" });
  });

  test("cancel", async () => {
    const response = await cancel.POST(post(), broadcastContext());
    expect(await response.json()).toEqual({ status: "canceled" });
    expect(cancelBroadcast.mock.calls[0]).toEqual([scope, "bcast_1", { billing: usageGate }]);
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({
      action: "broadcast.canceled",
      target: { type: "broadcast", id: "bcast_1" },
    });
  });

  test("members can't, and suspended organizations change nothing", async () => {
    role = "member";
    const asMember = await pause.POST(post(), broadcastContext());
    expect(asMember.status).toBe(403);
    expect((await errorOf(asMember)).message).toBe("Your role can't do this.");
    role = "owner";
    suspended = true;
    const whileSuspended = await cancel.POST(post(), broadcastContext());
    expect(whileSuspended.status).toBe(403);
    expect((await errorOf(whileSuspended)).message).toContain("suspended");
    expect(pauseBroadcast).not.toHaveBeenCalled();
    expect(cancelBroadcast).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test("another environment's broadcast is a 404 without an audit event", async () => {
    broadcastEnvironment = "env_other";
    for (const route of [pause, resume, cancel]) {
      const response = await route.POST(post(), broadcastContext());
      expect(response.status).toBe(404);
    }
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test("a refused change is a 400 with the package's message, without an audit event", async () => {
    resumeBroadcast.mockImplementationOnce(async () => {
      throw new emailModule.BroadcastError(
        "mailing_address_required",
        "Broadcasts need this environment's postal address: set it in the marketing settings first.",
      );
    });
    const refused = await resume.POST(post(), broadcastContext());
    expect(refused.status).toBe(400);
    expect((await errorOf(refused)).message).toContain("postal address");
    pauseBroadcast.mockImplementationOnce(async () => {
      throw new emailModule.BroadcastError(
        "broadcast_not_sendable",
        "A sent broadcast can't be paused.",
      );
    });
    expect((await pause.POST(post(), broadcastContext())).status).toBe(400);
    cancelBroadcast.mockImplementationOnce(async () => {
      throw new emailModule.EmailError("domain_not_verified", "acme.com is not verified.");
    });
    expect((await cancel.POST(post(), broadcastContext())).status).toBe(400);
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("marketing settings", () => {
  test("the settings form's fields, nothing more", async () => {
    const response = await marketing.GET(get(), envContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      settings: {
        display_name: "Acme",
        mailing_address: "Acme Inc.\n1 Main St",
        double_opt_in_default: true,
        confirmation_from: "Acme <news@acme.com>",
        confirmation_subject: "Confirm",
        confirmation_html: null,
        confirmed_redirect_url: "https://acme.com/welcome",
      },
    });
  });

  test("never saved: the defaults", async () => {
    mailingAddress = null;
    const body = await (await marketing.GET(get(), envContext)).json();
    expect(body.settings).toEqual({
      display_name: null,
      mailing_address: null,
      double_opt_in_default: false,
      confirmation_from: null,
      confirmation_subject: null,
      confirmation_html: null,
      confirmed_redirect_url: null,
    });
  });

  test("roles without contact:read get a 403", async () => {
    role = "guest";
    expect((await marketing.GET(get(), envContext)).status).toBe(403);
  });
});
