import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  applyTenantStatus,
  authorizeLiveSender,
  checkDomain,
  createDomain,
  deleteDomain,
} from "../src/domains.ts";
import { EmailError } from "../src/errors.ts";
import { ingestProviderEvents } from "../src/events.ts";
import type { OutboundEmail } from "../src/provider.ts";
import { IdentityTakenError } from "../src/provider.ts";
import { getEmail } from "../src/read.ts";
import { createEmailRuntime } from "../src/runtime.ts";
import { SesIdentityProvider } from "../src/ses/identity.ts";
import { encodeAddress, encodeWords } from "../src/ses/mime.ts";
import { parseSesMessage } from "../src/ses/parse.ts";
import { SesEmailProvider } from "../src/ses/provider.ts";
import { FakeSesApi } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

const config = { region: "eu-west-1", configurationSet: "coss-test", tenantPrefix: "test" };

function outbound(overrides: Partial<OutboundEmail> = {}): OutboundEmail {
  return {
    emailId: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
    organizationId: "org_01k7c8m4q2f3e9v6t5r1n0p8yz",
    from: "Acme <hello@acme.com>",
    to: ["a@example.com"],
    cc: [],
    bcc: [],
    replyTo: [],
    subject: "Hi",
    html: "<p>Hi</p>",
    text: null,
    headers: {},
    tags: [{ name: "kind", value: "welcome" }],
    ...overrides,
  };
}

describe("encodeAddress", () => {
  test("keeps ASCII names and encodes others as RFC 2047 words", () => {
    expect(encodeAddress("hello@acme.com")).toBe("hello@acme.com");
    expect(encodeAddress("Acme <hello@acme.com>")).toBe("Acme <hello@acme.com>");
    expect(encodeAddress('"Acme, Inc." <hello@acme.com>')).toBe('"Acme, Inc." <hello@acme.com>');
    expect(encodeAddress("Zoë <zoe@acme.com>")).toBe("=?UTF-8?B?Wm/Dqw==?= <zoe@acme.com>");
    expect(encodeAddress('"Zoë, Ltd" <zoe@acme.com>')).toBe(
      `${encodeWords("Zoë, Ltd")} <zoe@acme.com>`,
    );
  });

  test("splits long names into words of at most 75 characters", () => {
    const words = encodeWords("é".repeat(60)).split(" ");
    expect(words.length).toBeGreaterThan(1);
    expect(words.every((word) => word.length <= 75)).toBe(true);
    const decoded = words
      .map((word) => Buffer.from(word.slice(10, -2), "base64").toString("utf8"))
      .join("");
    expect(decoded).toBe("é".repeat(60));
  });
});

describe("SesEmailProvider", () => {
  test("sends with the tenant, configuration set and only the email id tag", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config);

    const result = await provider.send(
      outbound({
        to: ["A <a@example.com>", "Zoë <z@example.com>"],
        cc: ["a@EXAMPLE.com", "c@example.com"],
        bcc: ["c@example.com", "d@example.com"],
        replyTo: ["support@acme.com"],
        text: "Hi",
        headers: { "x-campaign": "fall" },
      }),
    );

    expect(result).toEqual({ providerMessageId: "ses-1" });
    expect(api.sent[0]).toEqual({
      FromEmailAddress: "Acme <hello@acme.com>",
      Destination: {
        ToAddresses: ["A <a@example.com>", "=?UTF-8?B?Wm/Dqw==?= <z@example.com>"],
        CcAddresses: ["c@example.com"],
        BccAddresses: ["d@example.com"],
      },
      ReplyToAddresses: ["support@acme.com"],
      Content: {
        Simple: {
          Subject: { Data: "Hi", Charset: "UTF-8" },
          Body: {
            Html: { Data: "<p>Hi</p>", Charset: "UTF-8" },
            Text: { Data: "Hi", Charset: "UTF-8" },
          },
          Headers: [{ Name: "x-campaign", Value: "fall" }],
        },
      },
      ConfigurationSetName: "coss-test",
      TenantName: "test-org_01k7c8m4q2f3e9v6t5r1n0p8yz",
      EmailTags: [{ Name: "coss_email_id", Value: "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }],
    });
  });

  test("retries throttling only", async () => {
    const api = new FakeSesApi();
    const provider = new SesEmailProvider(api, config, { sleep: async () => {} });
    api.fail("sendEmail", "TooManyRequestsException", 2);
    expect((await provider.send(outbound())).providerMessageId).toBe("ses-1");
    expect(api.operations()).toEqual(["sendEmail", "sendEmail", "sendEmail"]);

    api.fail("sendEmail", "TooManyRequestsException", 3);
    await expect(provider.send(outbound())).rejects.toThrow("TooManyRequestsException");
    api.fail("sendEmail", "MessageRejected");
    await expect(provider.send(outbound())).rejects.toThrow("MessageRejected");
    expect(api.operations()).toHaveLength(7);
  });
});

describe("SesIdentityProvider", () => {
  test("creates the tenant once, with tenant-level suppression and the configuration set", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);

    const tenant = await identity.ensureTenant({ organizationId: "org_a" });
    expect(tenant).toEqual({
      tenantName: "test-org_a",
      tenantArn: "arn:aws:ses:eu-west-1:123456789012:tenant/test-org_a/t-1",
    });
    expect(api.calls[0]?.input).toMatchObject({
      SuppressionAttributes: {
        SuppressionScope: "TENANT",
        SuppressedReasons: ["BOUNCE", "COMPLAINT"],
      },
    });
    expect(
      api.associations.get("arn:aws:ses:eu-west-1:123456789012:configuration-set/coss-test"),
    ).toEqual(new Set(["test-org_a"]));

    expect(await identity.ensureTenant({ organizationId: "org_a" })).toEqual(tenant);
  });

  test("creates domain identities with MAIL FROM, associated with the tenant", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const tenant = await identity.ensureTenant({ organizationId: "org_a" });

    const created = await identity.createDomainIdentity({
      tenant,
      domain: "acme.com",
      mailFromDomain: "send.acme.com",
    });

    expect(created).toEqual({
      dkimTokens: api.identities.get("acme.com")?.tokens ?? [],
      dkimHostedZone: "dkim.amazonses.com",
      region: "eu-west-1",
    });
    expect(api.calls.find((c) => c.operation === "createEmailIdentity")?.input).toMatchObject({
      ConfigurationSetName: "coss-test",
      DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" },
    });
    expect(api.identities.get("acme.com")?.mailFrom).toBe("send.acme.com");
    expect(api.associations.get(api.identityArn("acme.com"))).toEqual(new Set(["test-org_a"]));

    expect(await identity.getDomainIdentity("acme.com")).toMatchObject({
      status: "pending",
      canSend: false,
      mailFromStatus: "pending",
    });
    api.verify("acme.com");
    expect(await identity.getDomainIdentity("acme.com")).toMatchObject({
      status: "verified",
      canSend: true,
      mailFromStatus: "success",
    });
    expect(await identity.getDomainIdentity("unknown.com")).toBeNull();

    await identity.deleteDomainIdentity({ tenant, domain: "acme.com" });
    expect(api.identities.has("acme.com")).toBe(false);
    expect(api.associations.get(api.identityArn("acme.com"))?.size).toBe(0);
    // Already gone: still fine.
    await identity.deleteDomainIdentity({ tenant, domain: "acme.com" });
  });

  test("never adopts another tenant's identity; recreates orphans with new keys", async () => {
    const api = new FakeSesApi();
    const identity = new SesIdentityProvider(api, config);
    const a = await identity.ensureTenant({ organizationId: "org_a" });
    const b = await identity.ensureTenant({ organizationId: "org_b" });
    await identity.createDomainIdentity({
      tenant: a,
      domain: "acme.com",
      mailFromDomain: "send.acme.com",
    });

    await expect(
      identity.createDomainIdentity({
        tenant: b,
        domain: "acme.com",
        mailFromDomain: "send.acme.com",
      }),
    ).rejects.toBeInstanceOf(IdentityTakenError);

    // An identity left behind without a tenant.
    await api.createEmailIdentity({ EmailIdentity: "orphan.com" });
    const oldTokens = api.identities.get("orphan.com")?.tokens;
    const recreated = await identity.createDomainIdentity({
      tenant: b,
      domain: "orphan.com",
      mailFromDomain: "send.orphan.com",
    });
    expect(recreated.dkimTokens).not.toEqual(oldTokens);
    expect(api.operations()).toContain("deleteEmailIdentity");
  });
});

const MAIL = {
  timestamp: "2026-10-10T12:00:00.000Z",
  source: "hello@acme.com",
  messageId: "0102019a-ses-message",
  destination: ["a@example.com", "b@example.com"],
  tags: { coss_email_id: ["email_01k7c8m4q2f3e9v6t5r1n0p8yz"], "ses:configuration-set": ["coss"] },
};

describe("parseSesMessage", () => {
  test("Send is about the whole message", () => {
    expect(parseSesMessage(JSON.stringify({ eventType: "Send", mail: MAIL, send: {} }))).toEqual({
      kind: "events",
      events: [
        {
          provider: "ses",
          providerEventType: "Send",
          emailId: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
          providerMessageId: "0102019a-ses-message",
          type: "email.sent",
          recipients: null,
          occurredAt: new Date("2026-10-10T12:00:00.000Z"),
          sourceId: "send",
          data: {},
        },
      ],
    });
  });

  test("Delivery, bounces, complaints and delays carry their details", () => {
    const delivery = parseSesMessage(
      JSON.stringify({
        eventType: "Delivery",
        mail: MAIL,
        delivery: {
          timestamp: "2026-10-10T12:00:02.000Z",
          recipients: ["a@example.com", "b@example.com"],
          smtpResponse: "250 2.6.0 Message received",
        },
      }),
    );
    expect(delivery).toMatchObject({
      events: [
        {
          type: "email.delivered",
          recipients: ["a@example.com", "b@example.com"],
          data: { delivery: { smtp_response: "250 2.6.0 Message received" } },
        },
      ],
    });

    const bounce = parseSesMessage(
      JSON.stringify({
        eventType: "Bounce",
        mail: MAIL,
        bounce: {
          bounceType: "Permanent",
          bounceSubType: "OnTenantSuppressionList",
          bouncedRecipients: [
            { emailAddress: "a@example.com", diagnosticCode: "smtp; 550 5.1.1" },
            { emailAddress: "b@example.com" },
          ],
          timestamp: "2026-10-10T12:00:03.000Z",
          feedbackId: "feedback-1",
        },
      }),
    );
    expect(bounce).toMatchObject({
      events: [
        {
          type: "email.bounced",
          recipients: ["a@example.com"],
          suppressed: true,
          sourceId: "feedback-1",
          data: {
            bounce: {
              type: "permanent",
              sub_type: "OnTenantSuppressionList",
              diagnostic_code: "smtp; 550 5.1.1",
            },
          },
        },
        { recipients: ["b@example.com"], data: { bounce: { diagnostic_code: null } } },
      ],
    });

    const complaint = parseSesMessage(
      JSON.stringify({
        eventType: "Complaint",
        mail: MAIL,
        complaint: {
          complainedRecipients: [{ emailAddress: "a@example.com" }],
          timestamp: "2026-10-10T13:00:00.000Z",
          feedbackId: "feedback-2",
          complaintFeedbackType: "abuse",
        },
      }),
    );
    expect(complaint).toMatchObject({
      events: [
        {
          type: "email.complained",
          data: { complaint: { feedback_type: "abuse", sub_type: null } },
        },
      ],
    });

    const delay = parseSesMessage(
      JSON.stringify({
        eventType: "DeliveryDelay",
        mail: MAIL,
        deliveryDelay: {
          timestamp: "2026-10-10T12:30:00.000Z",
          delayType: "MailboxFull",
          expirationTime: "2026-10-11T12:00:00.000Z",
          delayedRecipients: [{ emailAddress: "b@example.com", diagnosticCode: "452 full" }],
        },
      }),
    );
    expect(delay).toMatchObject({
      events: [
        {
          type: "email.delivery_delayed",
          recipients: ["b@example.com"],
          data: {
            delay: {
              type: "MailboxFull",
              expires_at: "2026-10-11T12:00:00.000Z",
              diagnostic_code: "452 full",
            },
          },
        },
      ],
    });
  });

  test("rejects and rendering failures fail the email", () => {
    expect(
      parseSesMessage(
        JSON.stringify({ eventType: "Reject", mail: MAIL, reject: { reason: "Bad content" } }),
      ),
    ).toMatchObject({
      events: [{ type: "email.failed", recipients: null, data: { failure: { code: "rejected" } } }],
    });
  });

  test("unwraps SNS envelopes and EventBridge events", () => {
    const record = { eventType: "Send", mail: MAIL, send: {} };
    expect(
      parseSesMessage(JSON.stringify({ Type: "Notification", Message: JSON.stringify(record) })),
    ).toMatchObject({ kind: "events", events: [{ type: "email.sent" }] });
    expect(
      parseSesMessage(
        JSON.stringify({ source: "aws.ses", "detail-type": "Email Sent", detail: record }),
      ),
    ).toMatchObject({ kind: "events", events: [{ type: "email.sent" }] });

    expect(
      parseSesMessage(
        JSON.stringify({
          "detail-type": "Sending Status Disabled",
          source: "aws.ses",
          time: "2026-10-10T14:00:00Z",
          resources: ["arn:aws:ses:eu-west-1:123456789012:tenant/test-org_a/t-1"],
          detail: {
            version: "1.0.0",
            data: {
              origin: "AWS_MANAGED",
              record: { status: "DISABLED", cause: "High bounce rate." },
            },
          },
        }),
      ),
    ).toEqual({
      kind: "tenant_status",
      status: {
        tenantName: "test-org_a",
        status: "disabled",
        cause: "High bounce rate.",
        occurredAt: new Date("2026-10-10T14:00:00Z"),
      },
    });
  });

  test("ignores what COSS doesn't track and throws on malformed JSON", () => {
    expect(parseSesMessage(JSON.stringify({ eventType: "Open", mail: MAIL, open: {} }))).toEqual({
      kind: "ignored",
      reason: "unhandled SES event type Open",
    });
    expect(parseSesMessage(JSON.stringify({ Type: "SubscriptionConfirmation" })).kind).toBe(
      "ignored",
    );
    expect(() => parseSesMessage("{nope")).toThrow();
  });
});

describe("SES end to end (fake SES)", () => {
  test("domain, live send, delivery events and tenant pausing", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const api = new FakeSesApi();
    const runtime = createEmailRuntime({
      provider: "ses",
      ses: { ...config, tenantPrefix: `t${uniqueSuffix()}`.slice(0, 32) },
      sesApi: api,
      dns: null,
      log: false,
    });
    const name = `t-${uniqueSuffix()}.coss.test`;

    const domain = await createDomain({ organizationId, name, userId: null }, runtime.domainDeps);
    expect(domain).toMatchObject({ provider: "ses", status: "pending", region: "eu-west-1" });
    await expect(
      authorizeLiveSender({ organizationId, from: `hello@${name}` }),
    ).rejects.toBeInstanceOf(EmailError);
    api.verify(name);
    expect(await checkDomain({ organizationId, id: domain.id }, runtime.domainDeps)).toMatchObject({
      status: "verified",
      canSend: true,
    });

    const { email } = await runtime.emailService.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: `Acme <hello@${name}>`, to: ["a@example.com", "b@example.com"] }),
    });
    expect(email).toMatchObject({ status: "sent", sandbox: false });
    expect(email.recipients.map((r) => r.status)).toEqual(["queued", "queued"]);
    const sent = api.sent.at(-1);
    expect(sent?.EmailTags).toEqual([{ Name: "coss_email_id", Value: email.id }]);

    const mail = { ...MAIL, messageId: "ses-1", tags: { coss_email_id: [email.id] } };
    const records = [
      { eventType: "Send", mail, send: {} },
      {
        eventType: "Delivery",
        mail,
        delivery: { timestamp: new Date().toISOString(), recipients: ["a@example.com"] },
      },
      {
        eventType: "Bounce",
        mail,
        bounce: {
          bounceType: "Permanent",
          bounceSubType: "General",
          bouncedRecipients: [{ emailAddress: "b@example.com" }],
          timestamp: new Date().toISOString(),
          feedbackId: "f-1",
        },
      },
    ];
    for (const record of records) {
      const parsed = parseSesMessage(JSON.stringify(record));
      if (parsed.kind !== "events") throw new Error("expected events");
      await ingestProviderEvents(parsed.events);
    }
    const after = await getEmail({
      organizationId,
      environmentId: tenant.production.id,
      id: email.id,
    });
    expect(after?.recipients.map((r) => [r.address, r.status])).toEqual([
      ["a@example.com", "delivered"],
      ["b@example.com", "bounced"],
    ]);

    // SES pauses the tenant; COSS refuses live sends until it is re-enabled.
    const [emailTenant] = await db
      .select()
      .from(schema.emailTenant)
      .where(eq(schema.emailTenant.organizationId, organizationId));
    if (!emailTenant) throw new Error("no tenant");
    expect(sent?.TenantName).toBe(emailTenant.tenantName);
    const prefix = emailTenant.tenantName.slice(0, emailTenant.tenantName.indexOf("-"));
    const at = new Date();
    expect(
      await applyTenantStatus(
        {
          tenantName: emailTenant.tenantName,
          status: "disabled",
          cause: "Bounces",
          occurredAt: at,
        },
        prefix,
      ),
    ).toBe(true);
    // Older or foreign reports are ignored.
    expect(
      await applyTenantStatus(
        {
          tenantName: emailTenant.tenantName,
          status: "enabled",
          cause: null,
          occurredAt: new Date(at.getTime() - 1000),
        },
        prefix,
      ),
    ).toBe(false);
    expect(
      await applyTenantStatus(
        {
          tenantName: emailTenant.tenantName,
          status: "enabled",
          cause: null,
          occurredAt: new Date(),
        },
        "other",
      ),
    ).toBe(false);
    await expect(
      authorizeLiveSender({ organizationId, from: `hello@${name}` }),
    ).rejects.toMatchObject({ code: "sending_paused" });

    await deleteDomain({ organizationId, id: domain.id }, runtime.domainDeps);
    expect(api.identities.has(name)).toBe(false);
  });
});
