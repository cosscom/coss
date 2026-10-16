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
    environment: { id: "env_1", name: "Development", slug: "development", mode: "sandbox" },
  }),
}));

let endpointEnvironment = "env_1";
const retryWebhookDelivery = mock(async (_input: unknown) => true);
const updateWebhookEndpoint = mock(async (_input: unknown, _deps: unknown) => ({}));
const recoverWebhookEndpoint = mock(async (_input: unknown) => ({ requeued: 3, hasMore: false }));
const webhooksModule = await import("@coss/webhooks");
mock.module("@coss/webhooks", () => ({
  ...webhooksModule,
  getWebhookEndpoint: async () => ({
    id: "whep_1",
    url: "https://example.com/hook",
    projectId: "proj_1",
    environmentId: endpointEnvironment,
  }),
  retryWebhookDelivery,
  recoverWebhookEndpoint,
  updateWebhookEndpoint,
}));
mock.module("@/lib/webhooks", () => ({ webhookManagementDeps: () => ({}) }));

const cancelScheduledEmail = mock(async (_input: unknown) => {});
const rescheduleEmail = mock(async (input: { emailId: string; scheduledAt: string }) => ({
  id: input.emailId,
  scheduled_at: new Date(input.scheduledAt).toISOString(),
}));
const emailModule = await import("@coss/email");
mock.module("@coss/email", () => ({ ...emailModule, cancelScheduledEmail, rescheduleEmail }));

const assessment = {
  id: "rsk_1",
  event: "signup",
  event_name: null,
  decision: "review",
  score: 0.6,
  reasons: [{ code: "ip.proxy", message: "The IP address is a proxy." }],
  signals: {},
  user: { id: "usr_1", email: null },
  ip: null,
  degraded: [],
  outcome: "legitimate",
  review_status: "resolved",
  created_at: "2026-10-15T00:00:00.000Z",
};
const recordRiskFeedback = mock(async (..._args: unknown[]) => assessment);
const riskModule = await import("@coss/risk");
const listRiskAssessments = mock(async (..._args: unknown[]) => ({ data: [], has_more: false }));
mock.module("@coss/risk", () => ({ ...riskModule, recordRiskFeedback, listRiskAssessments }));
mock.module("@/lib/risk", () => ({ riskHasher: () => ({}) }));

const recordAudit = mock(async (_session: unknown, _input: unknown) => {});
mock.module("@/lib/audit", () => ({ recordAudit }));
mock.module("@/lib/rate-limit-runtime", () => ({
  rateLimitRuntime: () => ({
    clientIp: () => "203.0.113.9",
    limiter: { consume: async () => ({ allowed: true, retryAfterMs: 0 }) },
  }),
}));

class BillingError extends Error {}
let auditPlanAllows = true;
mock.module("@/lib/billing", () => ({
  planGate: () => ({
    requireFeature: async () => {
      if (!auditPlanAllows) throw new BillingError("plan");
    },
  }),
}));
const billingModule = await import("@coss/billing");
mock.module("@coss/billing", () => ({ ...billingModule, BillingError }));

const retry = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]/deliveries/[deliveryId]/retry/route"
);
const feedback = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/[assessmentId]/feedback/route"
);
const cancel = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/emails/[emailId]/cancel/route"
);
const recover = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]/recover/route"
);
const reschedule = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/emails/[emailId]/reschedule/route"
);
const enabled = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/webhooks/[endpointId]/enabled/route"
);
const riskList = await import(
  "../src/app/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/risk/route"
);
const billing = await import("../src/app/api/mobile/v1/orgs/[orgSlug]/billing/route");
const audit = await import("../src/app/api/mobile/v1/orgs/[orgSlug]/audit/route");

const env = { orgSlug: "acme", projectSlug: "default", envSlug: "development" };

function post(body?: unknown): Request {
  return new Request("http://localhost:3000/api/mobile/v1/x", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function get(): Request {
  return new Request("http://localhost:3000/api/mobile/v1/x", {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

async function errorOf(response: Response) {
  return ((await response.json()) as MobileErrorBody).error;
}

const retryContext = {
  params: Promise.resolve({ ...env, endpointId: "whep_1", deliveryId: "whdel_1" }),
};
const feedbackContext = { params: Promise.resolve({ ...env, assessmentId: "rsk_1" }) };

beforeEach(() => {
  role = "owner";
  suspended = false;
  endpointEnvironment = "env_1";
  auditPlanAllows = true;
  retryWebhookDelivery.mockClear();
  recoverWebhookEndpoint.mockClear();
  cancelScheduledEmail.mockClear();
  rescheduleEmail.mockClear();
  updateWebhookEndpoint.mockClear();
  recordRiskFeedback.mockClear();
  recordAudit.mockClear();
});

describe("retrying a webhook delivery", () => {
  test("retries and records the dashboard's audit event", async () => {
    const response = await retry.POST(post(), retryContext);
    expect(response.status).toBe(200);
    expect(retryWebhookDelivery).toHaveBeenCalledWith({
      organizationId: "org_1",
      endpointId: "whep_1",
      id: "whdel_1",
    });
    expect(recordAudit).toHaveBeenCalledTimes(1);
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({
      action: "webhook_delivery.retried",
      target: { type: "webhook_endpoint", id: "whep_1" },
      metadata: { delivery_id: "whdel_1" },
    });
  });

  test("members can't, and suspended organizations change nothing", async () => {
    role = "member";
    const asMember = await retry.POST(post(), retryContext);
    expect(asMember.status).toBe(403);
    expect((await errorOf(asMember)).message).toBe("Your role can't do this.");

    role = "owner";
    suspended = true;
    const whileSuspended = await retry.POST(post(), retryContext);
    expect(whileSuspended.status).toBe(403);
    expect((await errorOf(whileSuspended)).message).toContain("suspended");
    expect(retryWebhookDelivery).not.toHaveBeenCalled();
  });

  test("only an endpoint of this environment", async () => {
    endpointEnvironment = "env_other";
    const response = await retry.POST(post(), retryContext);
    expect(response.status).toBe(404);
    expect(retryWebhookDelivery).not.toHaveBeenCalled();
  });

  test("a delivery that is already scheduled is refused without an audit event", async () => {
    retryWebhookDelivery.mockImplementationOnce(async () => false);
    const response = await retry.POST(post(), retryContext);
    expect(response.status).toBe(400);
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("reporting a risk outcome", () => {
  test("records the outcome as the dashboard does", async () => {
    const response = await feedback.POST(post({ outcome: "legitimate" }), feedbackContext);
    expect(response.status).toBe(200);
    expect(recordRiskFeedback.mock.calls[0]?.slice(2)).toEqual([
      "rsk_1",
      { outcome: "legitimate" },
      { source: "dashboard", actorId: "user_1" },
    ]);
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({
      action: "risk_assessment.feedback",
      target: { type: "risk_assessment", id: "rsk_1" },
      metadata: { outcome: "legitimate" },
    });
  });

  test("invalid outcomes and notes are refused", async () => {
    for (const body of [{ outcome: "maybe" }, { outcome: "fraud", note: "x".repeat(501) }, null]) {
      const response = await feedback.POST(post(body), feedbackContext);
      expect(response.status).toBe(400);
    }
    expect(recordRiskFeedback).not.toHaveBeenCalled();
  });

  test("needs risk:feedback", async () => {
    role = "guest";
    const response = await feedback.POST(post({ outcome: "fraud" }), feedbackContext);
    expect(response.status).toBe(403);
  });
});

describe("canceling a scheduled email", () => {
  const cancelContext = { params: Promise.resolve({ ...env, emailId: "email_1" }) };

  test("cancels within the environment and records the dashboard's audit event", async () => {
    const response = await cancel.POST(post(), cancelContext);
    expect(response.status).toBe(200);
    expect(cancelScheduledEmail.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org_1",
      environmentId: "env_1",
      emailId: "email_1",
    });
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({
      action: "email.canceled",
      target: { type: "email", id: "email_1" },
    });
  });

  test("needs email:send", async () => {
    role = "guest";
    const response = await cancel.POST(post(), cancelContext);
    expect(response.status).toBe(403);
    expect(cancelScheduledEmail).not.toHaveBeenCalled();
  });

  test("an email that can't be canceled is refused without an audit event", async () => {
    cancelScheduledEmail.mockImplementationOnce(async () => {
      throw new emailModule.EmailError("email_not_cancelable", "This email can't be canceled.");
    });
    const response = await cancel.POST(post(), cancelContext);
    expect(response.status).toBe(400);
    expect((await errorOf(response)).message).toBe("This email can't be canceled.");
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("recovering an endpoint's failed deliveries", () => {
  const recoverContext = { params: Promise.resolve({ ...env, endpointId: "whep_1" }) };

  test("requeues since the chosen time and records the dashboard's audit event", async () => {
    const before = Date.now();
    const response = await recover.POST(post({ since_hours: 24 }), recoverContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ requeued: 3, has_more: false });
    const input = recoverWebhookEndpoint.mock.calls[0]?.[0] as { since: Date; id: string };
    expect(input.id).toBe("whep_1");
    expect(before - input.since.getTime()).toBeGreaterThanOrEqual(24 * 3_600_000 - 1_000);
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({
      action: "webhook_endpoint.recovered",
      metadata: { since: input.since.toISOString(), requeued: 3 },
    });
  });

  test("only the dashboard's periods, and only this environment's endpoints", async () => {
    for (const body of [{ since_hours: 2 }, {}, null]) {
      expect((await recover.POST(post(body), recoverContext)).status).toBe(400);
    }
    endpointEnvironment = "env_other";
    expect((await recover.POST(post({ since_hours: 1 }), recoverContext)).status).toBe(404);
    expect(recoverWebhookEndpoint).not.toHaveBeenCalled();
  });

  test("members can't", async () => {
    role = "member";
    expect((await recover.POST(post({ since_hours: 1 }), recoverContext)).status).toBe(403);
  });
});

describe("rescheduling a scheduled email", () => {
  const rescheduleContext = { params: Promise.resolve({ ...env, emailId: "email_1" }) };
  const later = () => new Date(Date.now() + 2 * 3_600_000).toISOString();

  test("moves it within the environment and records the API's audit event", async () => {
    const at = later();
    const response = await reschedule.POST(post({ scheduled_at: at }), rescheduleContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scheduled_at: at });
    expect(rescheduleEmail.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org_1",
      environmentId: "env_1",
      emailId: "email_1",
      scheduledAt: at,
    });
    expect(recordAudit.mock.calls[0]?.[1]).toMatchObject({
      action: "email.rescheduled",
      target: { type: "email", id: "email_1" },
      metadata: { scheduled_at: at },
    });
  });

  test("refuses times without an offset or more than 30 days ahead", async () => {
    const tooFar = new Date(Date.now() + 31 * 24 * 3_600_000).toISOString();
    for (const body of [{ scheduled_at: "2026-10-20T09:00" }, { scheduled_at: tooFar }, {}, null]) {
      expect((await reschedule.POST(post(body), rescheduleContext)).status).toBe(400);
    }
    expect(rescheduleEmail).not.toHaveBeenCalled();
  });

  test("needs email:send, and an email that isn't scheduled is refused", async () => {
    role = "guest";
    expect((await reschedule.POST(post({ scheduled_at: later() }), rescheduleContext)).status).toBe(
      403,
    );
    role = "owner";
    rescheduleEmail.mockImplementationOnce(async () => {
      throw new emailModule.EmailError(
        "email_not_reschedulable",
        "Only scheduled emails can be rescheduled.",
      );
    });
    const response = await reschedule.POST(post({ scheduled_at: later() }), rescheduleContext);
    expect(response.status).toBe(400);
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe("enabling and disabling a webhook endpoint", () => {
  const enabledContext = { params: Promise.resolve({ ...env, endpointId: "whep_1" }) };

  test("records the dashboard's audit events", async () => {
    for (const value of [false, true]) {
      const response = await enabled.POST(post({ enabled: value }), enabledContext);
      expect(response.status).toBe(200);
      expect(updateWebhookEndpoint.mock.calls.at(-1)?.[0]).toEqual({
        organizationId: "org_1",
        id: "whep_1",
        enabled: value,
      });
      expect(recordAudit.mock.calls.at(-1)?.[1]).toMatchObject({
        action: value ? "webhook_endpoint.enabled" : "webhook_endpoint.disabled",
        target: { type: "webhook_endpoint", id: "whep_1" },
      });
    }
  });

  test("only a boolean, only this environment's endpoints, not for members", async () => {
    expect((await enabled.POST(post({ enabled: "yes" }), enabledContext)).status).toBe(400);
    endpointEnvironment = "env_other";
    expect((await enabled.POST(post({ enabled: true }), enabledContext)).status).toBe(404);
    endpointEnvironment = "env_1";
    role = "member";
    expect((await enabled.POST(post({ enabled: true }), enabledContext)).status).toBe(403);
    expect(updateWebhookEndpoint).not.toHaveBeenCalled();
  });
});

describe("the review queue", () => {
  const listContext = { params: Promise.resolve(env) };
  const list = () =>
    new Request("http://localhost:3000/api/mobile/v1/x?view=review", {
      headers: { authorization: `Bearer ${TOKEN}` },
    });

  test("filters open reviews and says who may resolve them", async () => {
    const response = await riskList.GET(list(), listContext);
    expect(await response.json()).toMatchObject({ data: [], can_review: true });
    expect(listRiskAssessments.mock.calls.at(-1)?.[1]).toMatchObject({ review_status: "open" });
    role = "member";
    expect(await (await riskList.GET(list(), listContext)).json()).toMatchObject({
      can_review: false,
    });
    suspended = true;
    role = "owner";
    expect(await (await riskList.GET(list(), listContext)).json()).toMatchObject({
      can_review: false,
    });
  });
});

describe("organization reads", () => {
  const orgContext = { params: Promise.resolve({ orgSlug: "acme" }) };

  test("billing needs billing:read", async () => {
    role = "member";
    expect((await billing.GET(get(), orgContext)).status).toBe(403);
  });

  test("the audit log needs audit:read and reports the plan gate", async () => {
    role = "member";
    expect((await audit.GET(get(), orgContext)).status).toBe(403);
    role = "admin";
    auditPlanAllows = false;
    const response = await audit.GET(get(), orgContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ plan_allows: false, data: [], next_cursor: null });
  });
});
