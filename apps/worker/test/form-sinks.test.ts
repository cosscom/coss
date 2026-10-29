import { beforeAll, describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import {
  DEVELOPMENT_LINK_KEYS,
  EmailError,
  FakeEmailProvider,
  type SendEmailInput,
} from "@coss/email";
import { dispatchingEmailService } from "@coss/email/testing";
import type { FormEmail } from "@coss/forms";
import { emailSendQuota, type RateLimiter } from "@coss/ratelimit";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { formContactSink } from "../src/form-contacts.ts";
import { formMailer, formVerificationQuota } from "../src/form-mailer.ts";

const live = {
  organizationId: "org_customer",
  projectId: "proj_customer",
  environmentId: "env_live",
  mode: "live" as const,
};
const coss = {
  organizationId: "org_coss",
  projectId: "proj_coss",
  environmentId: "env_coss",
  mode: "live" as const,
};

function email(overrides: Partial<FormEmail> = {}): FormEmail {
  return {
    environment: live,
    from: null,
    senderName: "Contact us",
    to: ["owner@acme.test"],
    replyTo: "ada@example.com",
    subject: "New submission to Contact us",
    text: "text",
    html: "<p>html</p>",
    idempotencyKey: "form-notification:fsub_1",
    customerOnly: false,
    category: "form_notification",
    ...overrides,
  };
}

function service(fail?: (input: SendEmailInput) => Error | null) {
  const sent: SendEmailInput[] = [];
  return {
    sent,
    async send(input: SendEmailInput) {
      const error = fail?.(input);
      if (error) throw error;
      sent.push(input);
      return {} as never;
    },
  };
}

describe("formMailer", () => {
  test("notifications without a sender come from coss.com, replying to the submitter", async () => {
    const recorder = service();
    const mailer = formMailer({
      service: recorder,
      limiter: memoryLimiter(),
      fallback: { environment: coss, address: "forms@coss.com" },
    });
    await mailer.send(email());
    expect(recorder.sent[0]).toMatchObject({
      environment: coss,
      discardBody: true,
      params: {
        from: '"Contact us via coss.com" <forms@coss.com>',
        reply_to: ["ada@example.com"],
        category: "form_notification",
        tracking: { opens: false, clicks: false, unsubscribe: false },
      },
    });
  });

  test("verification emails never fall back to coss.com", async () => {
    const unverified = service(() => new EmailError("domain_not_verified", "Not verified."));
    const mailer = formMailer({
      service: unverified,
      limiter: memoryLimiter(),
      fallback: { environment: coss, address: "forms@coss.com" },
    });
    await expect(
      mailer.send(email({ customerOnly: true, from: "hello@acme.test" })),
    ).rejects.toThrow("Not verified.");
    await expect(mailer.send(email({ customerOnly: true }))).rejects.toThrow("confirmation_from");
    expect(unverified.sent).toEqual([]);
  });

  test("sandbox environments send in their own environment", async () => {
    const recorder = service();
    const mailer = formMailer({ service: recorder, limiter: memoryLimiter(), fallback: null });
    const sandbox = { ...live, mode: "sandbox" as const };
    await mailer.send(email({ environment: sandbox }));
    expect(recorder.sent[0]).toMatchObject({
      environment: sandbox,
      // Kept, so the dashboard shows the links to test with.
      discardBody: false,
      params: { from: '"Contact us via coss.com" <forms@coss.com>' },
    });
  });
});

describe("formMailer's send quota", () => {
  test("charged per recipient, refunded when nothing was sent", async () => {
    const inner = memoryLimiter();
    let net = 0;
    const limiter: RateLimiter = {
      ...inner,
      async consume(request) {
        const result = await inner.consume(request);
        if (result.allowed) net += request.cost ?? 1;
        return result;
      },
      async refund(request) {
        net -= request.cost ?? 1;
        await inner.refund(request);
      },
    };
    const sandbox = { ...live, mode: "sandbox" as const };
    const failing = formMailer({
      service: service(() => new Error("SES is down")),
      limiter,
      fallback: null,
    });
    await expect(failing.send(email({ environment: sandbox }))).rejects.toThrow("SES is down");
    expect(net).toBe(0);
    const sending = formMailer({ service: service(), limiter, fallback: null });
    await sending.send(email({ environment: sandbox, to: ["a@example.com", "b@example.com"] }));
    expect(net).toBe(2);
  });

  test("an organization over its send quota waits", async () => {
    const recorder = service();
    const limiter = memoryLimiter();
    const sandbox = { ...live, mode: "sandbox" as const };
    const quota = emailSendQuota(sandbox, 1);
    while ((await limiter.consume(quota)).allowed) {}
    const mailer = formMailer({ service: recorder, limiter, fallback: null });
    await expect(mailer.send(email({ environment: sandbox }))).rejects.toThrow("send quota");
    expect(recorder.sent).toEqual([]);
  });
});

describe("formVerificationQuota", () => {
  test("three emails per address a day, across organizations", async () => {
    const admit = formVerificationQuota(memoryLimiter());
    const results: boolean[] = [];
    for (const organizationId of ["org_a", "org_b", "org_a", "org_c"]) {
      results.push((await admit({ organizationId, address: "ada@example.com" })) !== null);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  test("a refund gives both charges back", async () => {
    const admit = formVerificationQuota(memoryLimiter());
    for (let i = 0; i < 3; i++) {
      const admission = await admit({ organizationId: "org_a", address: "bea@example.com" });
      await admission?.refund();
    }
    expect(await admit({ organizationId: "org_a", address: "bea@example.com" })).not.toBeNull();
  });
});

describe("formContactSink", () => {
  let tenant: TestTenant;
  let environment: {
    organizationId: string;
    projectId: string;
    environmentId: string;
    mode: "sandbox";
  };

  beforeAll(async () => {
    tenant = await createTestTenant();
    environment = {
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
      mode: "sandbox",
    };
  });

  test("adds the submitter as a contact, with typed properties; double opt-in emails them", async () => {
    await db.insert(schema.contactProperty).values([
      { ...environment, key: "company", type: "string" },
      { ...environment, key: "seats", type: "number" },
    ]);
    await db.insert(schema.marketingSettings).values({
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.environmentId,
      confirmationFrom: "hello@acme.test",
    });
    const provider = new FakeEmailProvider({ log: false });
    const emailService = dispatchingEmailService({
      liveProvider: provider,
      sandboxProvider: provider,
    });
    const sink = formContactSink({
      emailService,
      limiter: memoryLimiter(),
      linkKeys: DEVELOPMENT_LINK_KEYS,
      linkBaseUrl: "https://track.coss.test",
    });
    const base = {
      environment,
      firstName: "Ada",
      lastName: null,
      properties: { company: "Analytical", seats: "12", missing: "x" },
      audienceIds: [],
      topics: [],
    };
    await sink.add({ ...base, email: "ada@example.com", doubleOptIn: false });
    const [ada] = await db
      .select()
      .from(schema.contact)
      .where(
        and(
          eq(schema.contact.environmentId, environment.environmentId),
          eq(schema.contact.address, "ada@example.com"),
        ),
      );
    expect(ada).toMatchObject({
      status: "subscribed",
      source: "form",
      firstName: "Ada",
      properties: { company: "Analytical", seats: 12 },
    });

    await sink.add({ ...base, email: "grace@example.com", doubleOptIn: true });
    const [grace] = await db
      .select()
      .from(schema.contact)
      .where(
        and(
          eq(schema.contact.environmentId, environment.environmentId),
          eq(schema.contact.address, "grace@example.com"),
        ),
      );
    expect(grace?.status).toBe("pending");
    expect(provider.sent.some((message) => message.to.includes("grace@example.com"))).toBe(true);
  });
});
