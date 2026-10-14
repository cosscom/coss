import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { recordRiskFeedback } from "../src/feedback.ts";
import { addRiskListEntry } from "../src/lists.ts";
import { CreateRiskAssessmentRequest } from "../src/schemas.ts";
import { fakeMailDomains, TEST_IPS } from "../src/testing.ts";
import type { VelocityStore } from "../src/velocity.ts";
import { setup } from "./helpers.ts";

const codes = (assessment: { reasons: { code: string }[] }) =>
  assessment.reasons.map((reason) => reason.code);

describe("assessRisk", () => {
  test("a clean sign-up is allowed, with its signals, and logged", async () => {
    const { assess, live } = await setup();
    const { assessment, replayed } = await assess({
      event: "signup",
      user: { email: "Ada@Acme.io" },
      ip: TEST_IPS.residential,
      user_agent: "Mozilla/5.0",
    });
    expect(replayed).toBe(false);
    expect(assessment).toMatchObject({
      object: "risk_assessment",
      event: "signup",
      decision: "allow",
      score: 0,
      reasons: [],
      degraded: [],
      review_status: null,
      user: { id: null, email: "Ada@acme.io" },
      ip: TEST_IPS.residential,
      signals: {
        email: {
          domain: "acme.io",
          valid: true,
          disposable: false,
          deliverability: "deliverable",
          role_account: false,
          free_provider: false,
          suggestion: null,
        },
        ip: { tor: false, hosting: false, asn: 3320, country: "DE", private: false },
        velocity: { ip_1h: 1, ip_24h: 1, subnet_1h: 1, mailbox_24h: 1, email_domain_1h: 1 },
      },
    });
    const lines = await db
      .select()
      .from(schema.logEntry)
      .where(
        and(
          eq(schema.logEntry.environmentId, live.environmentId),
          eq(schema.logEntry.resourceId, assessment.id),
        ),
      );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ source: "risk", type: "risk.assessment", level: "info" });
    expect(lines[0]?.message).toBe("signup assessed: allow (score 0)");
  });

  test("a disposable address over Tor is blocked, most significant reason first", async () => {
    const { assess } = await setup();
    const { assessment } = await assess({
      event: "signup",
      user: { email: "x@mailinator.com" },
      ip: TEST_IPS.tor,
    });
    expect(assessment.decision).toBe("block");
    expect(assessment.score).toBe(0.85);
    expect(codes(assessment)).toEqual(["email.disposable", "ip.tor"]);
    expect(assessment.reasons[0]?.message).toBe(
      "The email domain belongs to a disposable-mail service.",
    );
  });

  test("typos, role accounts, undeliverable domains and hosting networks", async () => {
    const { assess } = await setup({
      checkMailDomain: fakeMailDomains({ "gone.example": "undeliverable" }),
    });
    const typo = (await assess({ event: "signup", user: { email: "ada@gmail.con" } })).assessment;
    expect(typo.reasons).toEqual([
      {
        code: "email.typo",
        suggestion: "gmail.com",
        message: "The domain looks like a typo of gmail.com.",
      },
    ]);
    const role = (await assess({ event: "signup", user: { email: "info@gone.example" } }))
      .assessment;
    expect(codes(role)).toEqual(["email.undeliverable", "email.role_account"]);
    const aws = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.aws })).assessment;
    expect(aws.reasons).toMatchObject([{ code: "ip.hosting_provider", provider: "aws" }]);
    const vpn = (await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.vpn })).assessment;
    expect(vpn.reasons).toMatchObject([{ code: "ip.vpn_network", provider: "m247" }]);
  });

  test("an invalid address gets no other email signal", async () => {
    const { assess } = await setup();
    const { assessment } = await assess({ event: "signup", user: { email: "not-an-address" } });
    expect(codes(assessment)).toEqual(["email.invalid"]);
    expect(assessment.signals.email?.valid).toBe(false);
    expect(assessment.signals.velocity).toEqual({});
  });

  test("a private IP is flagged as an integration mistake and never counted", async () => {
    const { assess } = await setup();
    for (let i = 0; i < 6; i++) {
      const { assessment } = await assess({ event: "signup", ip: "10.0.0.7" });
      expect(codes(assessment)).toEqual(["ip.private"]);
      expect(assessment.signals.velocity).toEqual({});
    }
  });

  test("custom events need a name; others refuse one", () => {
    expect(CreateRiskAssessmentRequest.safeParse({ event: "custom" }).success).toBe(false);
    expect(CreateRiskAssessmentRequest.safeParse({ event: "login", event_name: "x" }).success).toBe(
      false,
    );
    expect(
      CreateRiskAssessmentRequest.safeParse({ event: "custom", event_name: "invite_sent" }).success,
    ).toBe(true);
  });
});

describe("velocity", () => {
  test("the fifth sign-up from one IP in an hour fires, neighbours count per subnet", async () => {
    const { assess } = await setup();
    let last = null;
    for (let i = 0; i < 5; i++) {
      last = (
        await assess({
          event: "signup",
          user: { email: `u${i}@acme.io` },
          ip: TEST_IPS.residential,
        })
      ).assessment;
    }
    expect(last?.signals.velocity).toMatchObject({ ip_1h: 5, subnet_1h: 5, email_domain_1h: 5 });
    expect(last?.reasons).toMatchObject([
      {
        code: "velocity.signups_per_ip_1h",
        value: 5,
        threshold: 5,
        window: "1h",
        message: "5 sign-ups from this IP address in the last hour.",
      },
    ]);
    const neighbour = (await assess({ event: "signup", ip: TEST_IPS.neighbour })).assessment;
    expect(neighbour.signals.velocity).toMatchObject({ ip_1h: 1, subnet_1h: 6 });
  });

  test("events are counted per kind; free providers have no domain velocity", async () => {
    const { assess } = await setup();
    await assess({ event: "login", user: { id: "u1" }, ip: TEST_IPS.residential });
    const signup = (
      await assess({ event: "signup", user: { email: "a@gmail.com" }, ip: TEST_IPS.residential })
    ).assessment;
    expect(signup.signals.velocity).toEqual({
      ip_1h: 1,
      ip_24h: 1,
      subnet_1h: 1,
      subnet_24h: 1,
      mailbox_1h: 1,
      mailbox_24h: 1,
    });
    await assess({ event: "custom", event_name: "invite_sent", user: { id: "u1" } });
    const other = (await assess({ event: "custom", event_name: "export", user: { id: "u1" } }))
      .assessment;
    expect(other.signals.velocity).toEqual({ user_1h: 1, user_24h: 1 });
  });

  test("environments don't share counters", async () => {
    const { assess, sandbox } = await setup();
    await assess({ event: "login", user: { id: "u1" } });
    const other = (await assess({ event: "login", user: { id: "u1" } }, { env: sandbox }))
      .assessment;
    expect(other.signals.velocity).toEqual({ user_1h: 1, user_24h: 1 });
  });

  test("without velocity the assessment still happens, marked degraded", async () => {
    const broken: VelocityStore = {
      increment: async () => {
        throw new Error("connection refused");
      },
    };
    const { assess } = await setup({ velocity: broken });
    const { assessment } = await assess({ event: "signup", ip: TEST_IPS.residential });
    expect(assessment.decision).toBe("allow");
    expect(assessment.signals.velocity).toBeNull();
    expect(assessment.degraded).toEqual(["velocity"]);
  });
});

describe("degraded signals", () => {
  test("a slow DNS lookup gives up and is reported", async () => {
    const { assess } = await setup({
      checkMailDomain: () => new Promise(() => {}),
      dnsTimeoutMs: 20,
    });
    const { assessment } = await assess({ event: "signup", user: { email: "a@slow.example" } });
    expect(assessment.signals.email?.deliverability).toBe("unknown");
    expect(assessment.degraded).toEqual(["email_dns"]);
  });

  test("missing IP datasets are reported", async () => {
    const { createIpIntelligence } = await import("@coss/signals/ip");
    const { staticIpIntelligence } = await import("../src/testing.ts");
    const { assess } = await setup({
      ipIntelligence: staticIpIntelligence(createIpIntelligence({})),
    });
    const { assessment } = await assess({ event: "login", user: { id: "u" }, ip: TEST_IPS.tor });
    expect(assessment.degraded).toEqual(["ip_data"]);
    expect(assessment.signals.ip).toMatchObject({ tor: false, asn: null });
  });
});

describe("duplicates", () => {
  test("a second account for the same mailbox is flagged with the first user", async () => {
    const { assess } = await setup();
    const first = (
      await assess({ event: "signup", user: { id: "u1", email: "ada.lovelace+coss@gmail.com" } })
    ).assessment;
    expect(codes(first)).toEqual([]);
    // The same user again is not a duplicate of itself.
    const again = (
      await assess({ event: "signup", user: { id: "u1", email: "adalovelace@gmail.com" } })
    ).assessment;
    expect(codes(again)).not.toContain("duplicate.canonical_mailbox");
    const second = (
      await assess({ event: "signup", user: { id: "u2", email: "AdaLovelace@googlemail.com" } })
    ).assessment;
    expect(second.decision).toBe("review");
    // Also the third attempt for the mailbox today.
    expect(codes(second)).toEqual([
      "duplicate.canonical_mailbox",
      "velocity.signups_per_mailbox_24h",
    ]);
    expect(second.reasons[0]).toEqual({
      code: "duplicate.canonical_mailbox",
      previous_user: "u1",
      previous_assessment: first.id,
      message: "This mailbox already belongs to user u1.",
    });
  });

  test("attempts without a user id are not accounts", async () => {
    const { assess } = await setup();
    await assess({ event: "signup", user: { email: "ada@acme.io" } });
    const later = (await assess({ event: "signup", user: { id: "u9", email: "ada@acme.io" } }))
      .assessment;
    expect(codes(later)).toEqual([]);
  });

  test("blocked sign-ups don't claim the mailbox", async () => {
    const { assess, live } = await setup();
    await addRiskListEntry(live, { list: "block", type: "ip", value: TEST_IPS.tor });
    await assess({ event: "signup", user: { id: "bad", email: "ada@acme.io" }, ip: TEST_IPS.tor });
    const real = (await assess({ event: "signup", user: { id: "good", email: "ada@acme.io" } }))
      .assessment;
    expect(codes(real)).toEqual([]);
  });

  test("concurrent sign-ups for one mailbox: exactly one is flagged", async () => {
    const { assess } = await setup();
    const results = await Promise.all(
      ["u1", "u2"].map((id) => assess({ event: "signup", user: { id, email: "same@acme.io" } })),
    );
    const flagged = results.filter(({ assessment }) =>
      codes(assessment).includes("duplicate.canonical_mailbox"),
    );
    expect(flagged).toHaveLength(1);
  });
});

describe("lists", () => {
  test("block lists match parent domains, CIDR ranges, ASNs and countries", async () => {
    const { assess, live } = await setup();
    await addRiskListEntry(live, { list: "block", type: "domain", value: "evil.example" });
    await addRiskListEntry(live, { list: "block", type: "ip", value: "5.9.0.0/16" });
    await addRiskListEntry(live, { list: "block", type: "asn", value: "AS9009" });
    await addRiskListEntry(live, { list: "block", type: "country", value: "us" });
    const domain = (await assess({ event: "signup", user: { email: "x@mail.evil.example" } }))
      .assessment;
    expect(domain.decision).toBe("block");
    expect(domain.reasons).toMatchObject([{ code: "list.blocked", type: "domain" }]);
    const range = (await assess({ event: "login", user: { id: "u" }, ip: TEST_IPS.hosting }))
      .assessment;
    expect(codes(range)).toEqual(["list.blocked", "ip.hosting_provider"]);
    const asn = (await assess({ event: "login", user: { id: "u" }, ip: TEST_IPS.vpn })).assessment;
    expect(asn.reasons[0]).toMatchObject({ code: "list.blocked", type: "asn" });
    const country = (await assess({ event: "login", user: { id: "u" }, ip: TEST_IPS.aws }))
      .assessment;
    expect(country.reasons[0]).toMatchObject({ code: "list.blocked", type: "country" });
  });

  test("an allow-list match wins over everything, mailboxes are folded", async () => {
    const { assess, live } = await setup();
    await addRiskListEntry(live, { list: "allow", type: "email", value: "Q.A+x@gmail.com" });
    const { assessment } = await assess({
      event: "signup",
      user: { email: "qa@gmail.com" },
      ip: TEST_IPS.tor,
    });
    expect(assessment.decision).toBe("allow");
    expect(codes(assessment)).toEqual(["list.allowed", "ip.tor"]);
  });

  test("expired entries stop matching; other environments' lists never match", async () => {
    const { assess, live, sandbox } = await setup();
    await addRiskListEntry(live, {
      list: "block",
      type: "user",
      value: "u1",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    await addRiskListEntry(sandbox, { list: "block", type: "user", value: "u2" });
    expect((await assess({ event: "login", user: { id: "u1" } })).assessment.decision).toBe(
      "allow",
    );
    expect((await assess({ event: "login", user: { id: "u2" } })).assessment.decision).toBe(
      "allow",
    );
  });
});

describe("memory", () => {
  test("fraud feedback flags the mailbox, user and IP later; legitimate takes it back", async () => {
    const { assess, live, deps } = await setup();
    const first = (
      await assess({
        event: "signup",
        user: { id: "u1", email: "fraud@acme.io" },
        ip: TEST_IPS.residential,
      })
    ).assessment;
    const reported = await recordRiskFeedback(
      deps.hash,
      live,
      first.id,
      { outcome: "fraud" },
      {
        source: "api",
        actorId: null,
      },
    );
    expect(reported?.outcome).toBe("fraud");

    const sameUser = (await assess({ event: "login", user: { id: "u1" } })).assessment;
    expect(codes(sameUser)).toEqual(["history.fraud_user"]);
    const sameNetwork = (
      await assess({ event: "signup", user: { email: "new@acme.io" }, ip: TEST_IPS.neighbour })
    ).assessment;
    expect(codes(sameNetwork)).toEqual(["history.fraud_subnet"]);
    const sameMailbox = (
      await assess({
        event: "signup",
        user: { id: "u7", email: "fraud@acme.io" },
        ip: TEST_IPS.residential,
      })
    ).assessment;
    expect(codes(sameMailbox)).toEqual([
      "history.fraud_mailbox",
      "duplicate.canonical_mailbox",
      "history.fraud_ip",
    ]);
    expect(sameMailbox.decision).toBe("block");

    await recordRiskFeedback(
      deps.hash,
      live,
      first.id,
      { outcome: "legitimate" },
      {
        source: "dashboard",
        actorId: "user_x",
      },
    );
    const cleared = (await assess({ event: "login", user: { id: "u1" } })).assessment;
    expect(codes(cleared)).toEqual([]);
  });

  test("feedback resolves an open review; repeating it changes nothing", async () => {
    const { assess, live, deps } = await setup();
    const { assessment } = await assess({ event: "signup", user: { email: "x@mailinator.com" } });
    expect(assessment).toMatchObject({ decision: "review", review_status: "open" });
    const resolved = await recordRiskFeedback(
      deps.hash,
      live,
      assessment.id,
      { outcome: "abuse" },
      {
        source: "api",
        actorId: null,
      },
    );
    expect(resolved).toMatchObject({ outcome: "abuse", review_status: "resolved" });
    await recordRiskFeedback(
      deps.hash,
      live,
      assessment.id,
      { outcome: "abuse" },
      {
        source: "api",
        actorId: null,
      },
    );
    const rows = await db
      .select()
      .from(schema.riskFeedback)
      .where(eq(schema.riskFeedback.assessmentId, assessment.id));
    expect(rows).toHaveLength(1);
    expect(
      await recordRiskFeedback(
        deps.hash,
        live,
        "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz",
        {
          outcome: "fraud",
        },
        { source: "api", actorId: null },
      ),
    ).toBeNull();
  });
});

describe("review webhooks", () => {
  test("a review decision queues risk.assessment.review for subscribed endpoints", async () => {
    const { assess, live, organizationId } = await setup();
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId,
        environmentId: live.environmentId,
        url: "https://hooks.example.com/risk",
        eventTypes: ["risk.assessment.review"],
        apiVersion: "2026-10-10",
        userId: null,
      },
      testManagementDeps,
    );
    await assess({ event: "signup", user: { email: "ok@acme.io" } });
    const { assessment } = await assess({
      event: "signup",
      user: { id: "u1", email: "x@mailinator.com" },
    });
    const deliveries = await db
      .select({ payload: schema.webhookMessage.payload, type: schema.webhookMessage.type })
      .from(schema.webhookDelivery)
      .innerJoin(
        schema.webhookMessage,
        eq(schema.webhookMessage.id, schema.webhookDelivery.messageId),
      )
      .where(eq(schema.webhookDelivery.endpointId, endpoint.id));
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.type).toBe("risk.assessment.review");
    expect(deliveries[0]?.payload).toMatchObject({
      object: "event",
      type: "risk.assessment.review",
      data: {
        assessment_id: assessment.id,
        event: "signup",
        decision: "review",
        user_id: "u1",
        reasons: [{ code: "email.disposable" }],
      },
    });
    // Never the address or IP.
    expect(JSON.stringify(deliveries[0]?.payload)).not.toContain("mailinator");
  });
});

describe("idempotency", () => {
  test("a retry replays without counting the event again; another body is refused", async () => {
    const { assess } = await setup();
    const params = { event: "login" as const, user: { id: "u1" }, ip: TEST_IPS.residential };
    const first = await assess(params, { idempotencyKey: "k1" });
    const retry = await assess(params, { idempotencyKey: "k1" });
    expect(retry.replayed).toBe(true);
    expect(retry.assessment.id).toBe(first.assessment.id);
    const next = (await assess(params)).assessment;
    expect(next.signals.velocity).toMatchObject({ user_1h: 2 });
    await expect(
      assess({ ...params, user: { id: "u2" } }, { idempotencyKey: "k1" }),
    ).rejects.toMatchObject({
      code: "idempotency_key_reused",
    });
  });
});

describe("sandbox fixtures", () => {
  test("documentation addresses and .test domains behave as documented", async () => {
    const { assess, sandbox } = await setup({
      checkMailDomain: async () => {
        throw new Error("sandbox fixtures never reach DNS");
      },
    });
    const tor = (await assess({ event: "signup", ip: "192.0.2.1" }, { env: sandbox })).assessment;
    expect(codes(tor)).toEqual(["ip.tor"]);
    const cloud = (await assess({ event: "signup", ip: "192.0.2.2" }, { env: sandbox })).assessment;
    expect(cloud.reasons).toMatchObject([{ code: "ip.hosting_provider", provider: "aws" }]);
    const clean = (
      await assess(
        { event: "signup", user: { email: "a@acme.test" }, ip: "192.0.2.9" },
        { env: sandbox },
      )
    ).assessment;
    expect(clean.decision).toBe("allow");
    expect(clean.signals.ip).toMatchObject({ private: false, country: "GB" });
    const disposable = (
      await assess({ event: "signup", user: { email: "a@disposable.test" } }, { env: sandbox })
    ).assessment;
    expect(codes(disposable)).toEqual(["email.disposable"]);
    const undeliverable = (
      await assess({ event: "signup", user: { email: "a@undeliverable.test" } }, { env: sandbox })
    ).assessment;
    expect(codes(undeliverable)).toEqual(["email.undeliverable"]);
  });

  test("live environments don't use them", async () => {
    const { assess } = await setup({
      checkMailDomain: fakeMailDomains({ "acme.test": "undeliverable" }),
    });
    const { assessment } = await assess({
      event: "signup",
      user: { email: "a@acme.test" },
      ip: "192.0.2.1",
    });
    expect(codes(assessment)).toEqual(["email.undeliverable", "ip.private"]);
  });
});
