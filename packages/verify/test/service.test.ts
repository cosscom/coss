import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { suspendOrganization } from "@coss/reputation";
import { createTestSmsNumber } from "@coss/sms/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq, sql } from "drizzle-orm";
import { VerifyError } from "../src/errors.ts";
import { getVerification, listVerificationsPage } from "../src/read.ts";
import { purgeExpiredVerifications } from "../src/retention.ts";
import {
  CheckVerificationRequest,
  type CheckVerificationRequestInput,
  StartVerificationRequest,
  type StartVerificationRequestInput,
} from "../src/schemas.ts";
import type { VerifyEnvironment } from "../src/service.ts";
import { updateVerifySettings } from "../src/settings.ts";
import { fakeVerifyEmailSender, testVerifyService } from "../src/testing.ts";
import { recordDueVerifySmsUsage } from "../src/usage.ts";

const {
  billingHold,
  billingUsage,
  billingUsageAttribution,
  logEntry,
  smsMessage,
  verifyRequest,
  verifySend,
} = schema;

function env(environment: TestTenant["production"]): VerifyEnvironment {
  return {
    organizationId: environment.organizationId,
    projectId: environment.projectId,
    environmentId: environment.id,
    mode: environment.mode,
  };
}

const start = (params: StartVerificationRequestInput) => StartVerificationRequest.parse(params);
const check = (params: CheckVerificationRequestInput) => CheckVerificationRequest.parse(params);

async function usageOf(organizationId: string) {
  return db
    .select({
      meter: billingUsage.meter,
      dimension: billingUsage.dimension,
      quantity: sql<number>`sum(${billingUsage.quantity})::int`,
    })
    .from(billingUsage)
    .where(eq(billingUsage.organizationId, organizationId))
    .groupBy(billingUsage.meter, billingUsage.dimension);
}

async function rejected(promise: Promise<unknown>): Promise<VerifyError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof VerifyError) return error;
    throw error;
  }
  throw new Error("Expected a VerifyError.");
}

/** A random US number in an area code of its own (the fraud guard counts prefixes). */
function testMobile(): string {
  return `+1415${200 + Math.floor(Math.random() * 800)}${String(Math.floor(Math.random() * 10_000)).padStart(4, "0")}`;
}

describe("sandbox", () => {
  test("an SMS code is zeros, kept in the sandbox message, and approves once", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const to = "+15005550006";
    const { verification } = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params: start({ to }),
    });
    expect(verification).toMatchObject({
      channel: "sms",
      to,
      country: "US",
      status: "pending",
      sandbox: true,
      attempts: 0,
      max_attempts: 5,
    });
    expect(verification.sends).toHaveLength(1);
    expect(verification.sends[0]).toMatchObject({ channel: "sms", route: "shared_number" });
    // A sandbox's messages are its own, so it can look them up.
    expect(verification.sends[0]?.sms_id).toStartWith("sms_");
    expect(verify.lastSmsCode(to)).toBe("000000");
    const [sms] = await db
      .select({ body: smsMessage.body, env: smsMessage.environmentId })
      .from(smsMessage)
      .where(eq(smsMessage.organizationId, tenant.organization.id));
    expect(sms).toEqual({
      body: "Your Default verification code is 000000. Don't share it with anyone.".replace(
        "Default",
        tenant.project.name,
      ),
      env: tenant.development.id,
    });

    const wrong = await verify.check({
      environment: env(tenant.development),
      params: check({ verification_id: verification.id, code: "123456" }),
    });
    expect(wrong.valid).toBe(false);
    expect(wrong.verification).toMatchObject({ status: "pending", attempts: 1 });

    const right = await verify.check({
      environment: env(tenant.development),
      params: check({ to, code: "000000" }),
    });
    expect(right.valid).toBe(true);
    expect(right.verification.status).toBe("approved");
    // Again: still valid, nothing billed (sandbox never is).
    const again = await verify.check({
      environment: env(tenant.development),
      params: check({ to, code: "000000" }),
    });
    expect(again.valid).toBe(true);
    expect(await usageOf(tenant.organization.id)).toEqual([]);

    const lines = await db
      .select({ type: logEntry.type })
      .from(logEntry)
      .where(
        and(eq(logEntry.organizationId, tenant.organization.id), eq(logEntry.source, "verify")),
      );
    expect(lines.map((line) => line.type).sort()).toEqual([
      "verification.approved",
      "verification.check_failed",
      "verification.sent",
      "verification.started",
    ]);
  });

  test("email codes go through the email sender", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const { verification } = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params: start({ to: "Ada@Example.com" }),
    });
    expect(verification).toMatchObject({ channel: "email", to: "ada@example.com", country: null });
    expect(verification.sends[0]).toMatchObject({ route: "email", email_id: "email_test1" });
    expect(verify.emails.sent[0]?.subject).toBe(`Your ${tenant.project.name} verification code`);
    expect(verify.emails.sent[0]?.text).toContain("000000");
    const result = await verify.check({
      environment: env(tenant.development),
      params: check({ to: "ada@example.com", code: "000000" }),
    });
    expect(result.valid).toBe(true);
  });
});

describe("live", () => {
  test("from the environment's own number: a random code, the body discarded, billed once", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    await updateVerifySettings(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      { sms_from: number.phoneNumber, app_name: "Acme" },
    );
    const verify = testVerifyService();
    const to = testMobile();
    const { verification } = await verify.start({
      environment: env(tenant.production),
      apiKeyId: null,
      params: start({ to }),
    });
    expect(verification.sends[0]).toMatchObject({ route: "own_number" });
    expect(verification.sends[0]?.sms_id).toStartWith("sms_");
    const code = verify.lastSmsCode(to);
    expect(code).toMatch(/^\d{6}$/);
    const [sms] = await db
      .select({ body: smsMessage.body, from: smsMessage.from })
      .from(smsMessage)
      .where(eq(smsMessage.organizationId, tenant.organization.id));
    expect(sms).toEqual({ body: "", from: number.phoneNumber });

    const result = await verify.check({
      environment: env(tenant.production),
      params: check({ verification_id: verification.id, code }),
    });
    expect(result.valid).toBe(true);
    await verify.check({
      environment: env(tenant.production),
      params: check({ verification_id: verification.id, code }),
    });
    const usage = await usageOf(tenant.organization.id);
    expect(usage).toContainEqual({ meter: "verify.verifications", dimension: "", quantity: 1 });
  });

  test("from coss.com's shared numbers: the SMS is coss.com's, verify.sms is the customer's", async () => {
    const coss = await createTestTenant();
    const shared = await createTestSmsNumber(coss.organization.id);
    const tenant = await createTestTenant();
    const verify = testVerifyService({
      sharedSms: { environment: env(coss.production), numbers: [shared.phoneNumber] },
    });
    // An older send whose SMS is still waiting for its carrier (the fake provider delivers at once).
    const waiting = testMobile();
    await verify.start({
      environment: env(tenant.production),
      apiKeyId: null,
      params: start({ to: waiting }),
    });
    await db
      .update(smsMessage)
      .set({ status: "sent", usageRecordedAt: null })
      .where(and(eq(smsMessage.organizationId, coss.organization.id), eq(smsMessage.to, waiting)));
    const to = testMobile();
    const { verification } = await verify.start({
      environment: env(tenant.production),
      apiKeyId: null,
      params: start({ to }),
    });
    expect(verification.sends[0]).toMatchObject({ route: "shared_number", sms_id: null });
    const [sms] = await db
      .select({ id: smsMessage.id, body: smsMessage.body })
      .from(smsMessage)
      .where(and(eq(smsMessage.organizationId, coss.organization.id), eq(smsMessage.to, to)));
    expect(sms?.body).toBe("");

    const scope = { organizationIds: [tenant.organization.id] };
    // A batch of one: the waiting send doesn't take the place of the billable one.
    expect(await recordDueVerifySmsUsage({ scope, limit: 1 })).toBe(1);
    expect(await recordDueVerifySmsUsage({ scope })).toBe(0);
    // A send whose message id wasn't saved (the process stopped right after sending) is found
    // by its key, and billed once its SMS reached a carrier.
    await db
      .update(verifySend)
      .set({ smsId: null, createdAt: new Date(Date.now() - 5 * 60_000) })
      .where(eq(verifySend.requestId, verification.id));
    await db
      .update(verifySend)
      .set({ usageRecordedAt: null })
      .where(eq(verifySend.requestId, verification.id));
    expect(await recordDueVerifySmsUsage({ scope })).toBe(1);
    expect(await usageOf(tenant.organization.id)).toEqual([
      { meter: "verify.sms", dimension: "country=US", quantity: 2 },
    ]);
    // Interrupted at the provider: a late carrier callback can still repair (and bill) it.
    await db
      .update(smsMessage)
      .set({ status: "failed", errorCode: "dispatch_interrupted" })
      .where(and(eq(smsMessage.organizationId, coss.organization.id), eq(smsMessage.to, waiting)));
    expect(await recordDueVerifySmsUsage({ scope })).toBe(0);
    expect(await usageOf(tenant.organization.id)).toEqual([
      { meter: "verify.sms", dimension: "country=US", quantity: 2 },
    ]);
  });

  test("a reputation suspension stops live codes from coss.com's senders too", async () => {
    const coss = await createTestTenant();
    const shared = await createTestSmsNumber(coss.organization.id);
    const tenant = await createTestTenant();
    await suspendOrganization({
      organizationId: tenant.organization.id,
      trigger: "bounce_rate",
      actor: { kind: "system" },
    });
    const verify = testVerifyService({
      sharedSms: { environment: env(coss.production), numbers: [shared.phoneNumber] },
    });
    const error = await rejected(
      verify.start({
        environment: env(tenant.production),
        apiKeyId: null,
        params: start({ to: testMobile() }),
      }),
    );
    expect(error).toMatchObject({ code: "account_suspended", status: 403 });
  });

  test("a billing hold stops live codes, whichever sender would send them", async () => {
    const coss = await createTestTenant();
    const shared = await createTestSmsNumber(coss.organization.id);
    const tenant = await createTestTenant();
    await db
      .insert(billingHold)
      .values({ organizationId: tenant.organization.id, reason: "admin" });
    const verify = testVerifyService({
      sharedSms: { environment: env(coss.production), numbers: [shared.phoneNumber] },
    });
    for (const to of [testMobile(), "lee@example.com"]) {
      const error = await rejected(
        verify.start({
          environment: env(tenant.production),
          apiKeyId: null,
          params: start({ to }),
        }),
      );
      expect(error).toMatchObject({ code: "billing_hold", status: 402 });
    }
    expect(verify.emails.sent).toHaveLength(0);
  });

  test("a personal key's usage is its owner's spend", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const environment = env(tenant.production);
    const { verification } = await verify.start({
      environment,
      apiKeyId: "key_personal",
      apiKeyOwnerId: tenant.owner.id,
      params: start({ to: "owner@example.com" }),
    });
    expect(verify.emails.sent[0]).toMatchObject({
      apiKeyId: "key_personal",
      apiKeyOwnerId: tenant.owner.id,
    });
    const code = verify.lastEmailCode("owner@example.com");
    await verify.check({ environment, params: check({ verification_id: verification.id, code }) });
    const rows = await db
      .select({ meter: billingUsageAttribution.meter, userId: billingUsageAttribution.userId })
      .from(billingUsageAttribution)
      .where(eq(billingUsageAttribution.organizationId, tenant.organization.id));
    expect(rows).toContainEqual({ meter: "verify.verifications", userId: tenant.owner.id });
  });

  test("a resend's shared SMS is billed to the key that asked for it", async () => {
    const coss = await createTestTenant();
    const shared = await createTestSmsNumber(coss.organization.id);
    const tenant = await createTestTenant();
    const verify = testVerifyService({
      sharedSms: { environment: env(coss.production), numbers: [shared.phoneNumber] },
    });
    const environment = env(tenant.production);
    const params = start({ to: testMobile() });
    await verify.start({ environment, apiKeyId: "key_first", params });
    await verify.start({ environment, apiKeyId: "key_second", params });
    await recordDueVerifySmsUsage({ scope: { organizationIds: [tenant.organization.id] } });
    const rows = await db
      .select({ apiKeyId: billingUsageAttribution.apiKeyId })
      .from(billingUsageAttribution)
      .where(
        and(
          eq(billingUsageAttribution.organizationId, tenant.organization.id),
          eq(billingUsageAttribution.meter, "verify.sms"),
        ),
      );
    expect(rows.map((row) => row.apiKeyId).sort()).toEqual(["key_first", "key_second"]);
  });

  test("without shared numbers, live SMS needs the environment's own", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const error = await rejected(
      verify.start({
        environment: env(tenant.production),
        apiKeyId: null,
        params: start({ to: testMobile() }),
      }),
    );
    expect(error.code).toBe("shared_sender_unavailable");
    expect(error.status).toBe(503);
  });
});

describe("checks", () => {
  test("too many wrong codes fail the verification", async () => {
    const tenant = await createTestTenant();
    await updateVerifySettings(
      { organizationId: tenant.organization.id, environmentId: tenant.development.id },
      { max_attempts: 2 },
    );
    const verify = testVerifyService();
    const { verification } = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params: start({ to: "ada@example.com" }),
    });
    for (const code of ["111111", "222222"]) {
      await verify.check({
        environment: env(tenant.development),
        params: check({ verification_id: verification.id, code }),
      });
    }
    const last = await verify.check({
      environment: env(tenant.development),
      params: check({ verification_id: verification.id, code: "000000" }),
    });
    expect(last.valid).toBe(false);
    expect(last.verification).toMatchObject({
      status: "failed",
      failure: { code: "max_attempts" },
      attempts: 2,
    });
  });

  test("a retried check (same key) doesn't spend another attempt", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const { verification } = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params: start({ to: "grace@example.com" }),
    });
    for (let i = 0; i < 3; i++) {
      const result = await verify.check({
        environment: env(tenant.development),
        params: check({ verification_id: verification.id, code: "999999" }),
        idempotencyKey: "same-key",
      });
      expect(result.verification.attempts).toBe(1);
    }
  });

  test("a retried check gets its own answer, even after other checks", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const environment = env(tenant.development);
    const { verification } = await verify.start({
      environment,
      apiKeyId: null,
      params: start({ to: "sam@example.com" }),
    });
    const wrong = check({ verification_id: verification.id, code: "111111" });
    await verify.check({ environment, params: wrong, idempotencyKey: "a" });
    await verify.check({ environment, params: wrong, idempotencyKey: "b" });
    await verify.check({ environment, params: wrong });
    const retried = await verify.check({ environment, params: wrong, idempotencyKey: "a" });
    expect(retried).toMatchObject({ valid: false, verification: { attempts: 3 } });
  });

  test("an expired code is refused", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const { verification } = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params: start({ to: "lin@example.com" }),
    });
    await db
      .update(verifyRequest)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verifyRequest.id, verification.id));
    expect(
      (
        await getVerification({
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          verificationId: verification.id,
        })
      ).status,
    ).toBe("expired");
    const result = await verify.check({
      environment: env(tenant.development),
      params: check({ verification_id: verification.id, code: "000000" }),
    });
    expect(result).toMatchObject({ valid: false, verification: { status: "expired" } });
  });

  test("an unknown destination is not found", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const error = await rejected(
      verify.check({
        environment: env(tenant.development),
        params: check({ to: "nobody@example.com", code: "000000" }),
      }),
    );
    expect(error.code).toBe("not_found");
  });
});

describe("starting", () => {
  test("concurrent resends claim one send each, and every code they report still works", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const params = start({ to: "zoe@example.com" });
    await verify.start({ environment: env(tenant.development), apiKeyId: null, params });
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        verify.start({ environment: env(tenant.development), apiKeyId: null, params }),
      ),
    );
    const ids = new Set(results.map((result) => result.verification.id));
    expect(ids.size).toBe(1);
    const final = await getVerification({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      verificationId: [...ids][0] ?? "",
    });
    expect(final.status).toBe("pending");
    // One email per claimed send, never two for the same send number.
    expect(verify.emails.sent).toHaveLength(final.sends.length);
    expect(new Set(verify.emails.sent.map((sent) => sent.idempotencyKey)).size).toBe(
      verify.emails.sent.length,
    );
  });

  test("concurrent first starts make one verification, not two codes", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const params = start({ to: "ivy@example.com" });
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        verify.start({ environment: env(tenant.development), apiKeyId: null, params }),
      ),
    );
    expect(new Set(results.map((result) => result.verification.id)).size).toBe(1);
    const page = await listVerificationsPage({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      to: "ivy@example.com",
    });
    expect(page.data).toHaveLength(1);
  });

  test("a slow send that fails after a newer one went out doesn't fail the verification", async () => {
    const tenant = await createTestTenant();
    const recorded = fakeVerifyEmailSender();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const verify = testVerifyService({
      sendEmail: async (input) => {
        calls++;
        if (calls === 1) {
          await held;
          throw new Error("SES is down");
        }
        return recorded(input);
      },
    });
    const environment = env(tenant.development);
    const params = start({ to: "kim@example.com" });
    const first = verify.start({ environment, apiKeyId: null, params });
    // The first send is claimed and in flight; a resend claims the second and delivers it.
    while (calls === 0) await Bun.sleep(5);
    const second = await verify.start({ environment, apiKeyId: null, params });
    expect(second.verification.sends).toHaveLength(1);
    release();
    await expect(first).rejects.toThrow("SES is down");
    const final = await getVerification({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      verificationId: second.verification.id,
    });
    expect(final.status).toBe("pending");
    const checked = await verify.check({
      environment,
      params: check({ verification_id: final.id, code: "000000" }),
    });
    expect(checked.valid).toBe(true);
  });

  test("a retry finishes a send the process stopped before, with the same code", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    await updateVerifySettings(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      { sms_from: number.phoneNumber },
    );
    const verify = testVerifyService();
    const environment = env(tenant.production);
    const to = testMobile();
    const params = start({ to });
    const first = await verify.start({ environment, apiKeyId: null, params, idempotencyKey: "k1" });
    const code = verify.lastSmsCode(to);
    // As if the process stopped after claiming the send, before anything went out.
    await db
      .update(verifySend)
      .set({ smsId: null, createdAt: new Date(Date.now() - 60_000) })
      .where(eq(verifySend.requestId, first.verification.id));
    await db.delete(smsMessage).where(eq(smsMessage.organizationId, tenant.organization.id));
    verify.sms.provider.sent.length = 0;
    const retried = await verify.start({
      environment,
      apiKeyId: null,
      params,
      idempotencyKey: "k1",
    });
    expect(retried.replayed).toBe(true);
    expect(retried.verification.sends).toHaveLength(1);
    expect(verify.lastSmsCode(to)).toBe(code);
    const result = await verify.check({ environment, params: check({ to, code }) });
    expect(result.valid).toBe(true);
  });

  test("a retry links a send whose message id was lost, even after the sender changed", async () => {
    const tenant = await createTestTenant();
    const first = await createTestSmsNumber(tenant.organization.id);
    const second = await createTestSmsNumber(tenant.organization.id);
    const scope = { organizationId: tenant.organization.id, environmentId: tenant.production.id };
    await updateVerifySettings(scope, { sms_from: first.phoneNumber });
    const verify = testVerifyService();
    const environment = env(tenant.production);
    const to = testMobile();
    const params = start({ to });
    const started = await verify.start({
      environment,
      apiKeyId: null,
      params,
      idempotencyKey: "k2",
    });
    const smsId = started.verification.sends[0]?.sms_id;
    // As if the process stopped after sending, before saving the message's id.
    await db
      .update(verifySend)
      .set({ smsId: null, createdAt: new Date(Date.now() - 60_000) })
      .where(eq(verifySend.requestId, started.verification.id));
    await updateVerifySettings(scope, { sms_from: second.phoneNumber });
    const sentBefore = verify.sms.provider.sent.length;
    const retried = await verify.start({
      environment,
      apiKeyId: null,
      params,
      idempotencyKey: "k2",
    });
    expect(retried.replayed).toBe(true);
    expect(retried.verification.sends[0]?.sms_id).toBe(smsId);
    expect(verify.sms.provider.sent.length).toBe(sentBefore);
  });

  test("one key used for two destinations at once makes one request, never both", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const environment = env(tenant.development);
    // One destination already has a pending verification (the other request would resend it).
    await verify.start({ environment, apiKeyId: null, params: start({ to: "b@example.com" }) });
    const results = await Promise.allSettled(
      ["a@example.com", "b@example.com"].map((to) =>
        verify.start({
          environment,
          apiKeyId: null,
          params: start({ to }),
          idempotencyKey: "shared",
        }),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const refused = results.find((result) => result.status === "rejected");
    expect((refused as PromiseRejectedResult).reason).toMatchObject({
      code: "idempotency_key_reused",
    });
    expect(verify.emails.sent).toHaveLength(2);
  });

  test("a resend's Idempotency-Key replays it instead of sending again", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const params = start({ to: "max@example.com" });
    const environment = env(tenant.development);
    await verify.start({ environment, apiKeyId: null, params, idempotencyKey: "first" });
    const resent = await verify.start({
      environment,
      apiKeyId: null,
      params,
      idempotencyKey: "second",
    });
    expect(resent.verification.sends).toHaveLength(2);
    const again = await verify.start({
      environment,
      apiKeyId: null,
      params,
      idempotencyKey: "second",
    });
    expect(again.replayed).toBe(true);
    expect(again.verification.sends).toHaveLength(2);
    expect(verify.emails.sent).toHaveLength(2);
    // Approved: a retry of the resend still replays, it doesn't start a new verification.
    await verify.check({ environment, params: check({ to: "max@example.com", code: "000000" }) });
    const late = await verify.start({
      environment,
      apiKeyId: null,
      params,
      idempotencyKey: "second",
    });
    expect(late).toMatchObject({ replayed: true, verification: { status: "approved" } });
    const reused = await rejected(
      verify.start({
        environment,
        apiKeyId: null,
        params: start({ to: "other@example.com" }),
        idempotencyKey: "second",
      }),
    );
    expect(reused.code).toBe("idempotency_key_reused");
  });

  test("starting again resends the pending verification with a new code", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    await updateVerifySettings(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      { sms_from: number.phoneNumber },
    );
    const verify = testVerifyService();
    const to = testMobile();
    const first = await verify.start({
      environment: env(tenant.production),
      apiKeyId: null,
      params: start({ to }),
    });
    const firstCode = verify.lastSmsCode(to);
    const second = await verify.start({
      environment: env(tenant.production),
      apiKeyId: null,
      params: start({ to }),
    });
    expect(second.verification.id).toBe(first.verification.id);
    expect(second.verification.sends).toHaveLength(2);
    const secondCode = verify.lastSmsCode(to);
    if (firstCode !== secondCode) {
      const stale = await verify.check({
        environment: env(tenant.production),
        params: check({ to, code: firstCode }),
      });
      expect(stale.valid).toBe(false);
    }
    const fresh = await verify.check({
      environment: env(tenant.production),
      params: check({ to, code: secondCode }),
    });
    expect(fresh.valid).toBe(true);
  });

  test("an idempotent start replays without sending again", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const params = start({ to: "kay@example.com" });
    const first = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params,
      idempotencyKey: "start-1",
    });
    const again = await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params,
      idempotencyKey: "start-1",
    });
    expect(again.replayed).toBe(true);
    expect(again.verification.id).toBe(first.verification.id);
    expect(verify.emails.sent).toHaveLength(1);
    const reused = await rejected(
      verify.start({
        environment: env(tenant.development),
        apiKeyId: null,
        params: start({ to: "other@example.com" }),
        idempotencyKey: "start-1",
      }),
    );
    expect(reused.code).toBe("idempotency_key_reused");
  });

  test("the fraud guard blocks a premium-rate number before anything is sent", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const error = await rejected(
      verify.start({
        environment: env(tenant.development),
        apiKeyId: null,
        params: start({ to: "+19005551234" }),
      }),
    );
    expect(error.code).toBe("verification_blocked");
    const stored = await getVerification({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      verificationId: error.verificationId ?? "",
    });
    expect(stored).toMatchObject({
      status: "blocked",
      reasons: [{ code: "phone.premium_rate" }],
      sends: [],
    });
    expect(verify.sms.provider.sent.some((sent) => sent.to === "+19005551234")).toBe(false);
  });

  test("countries outside the settings are refused", async () => {
    const tenant = await createTestTenant();
    const verify = testVerifyService();
    const error = await rejected(
      verify.start({
        environment: env(tenant.development),
        apiKeyId: null,
        params: start({ to: "+447400123456" }),
      }),
    );
    expect(error.code).toBe("country_not_allowed");
  });
});

test("lists newest first and purges after retention", async () => {
  const tenant = await createTestTenant();
  const verify = testVerifyService();
  for (const to of ["a@example.com", "b@example.com", "c@example.com"]) {
    await verify.start({
      environment: env(tenant.development),
      apiKeyId: null,
      params: start({ to }),
    });
  }
  const scope = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
  const page = await listVerificationsPage({ ...scope, limit: 2 });
  expect(page.data.map((v) => v.to)).toEqual(["c@example.com", "b@example.com"]);
  expect(page.hasMore).toBe(true);
  const next = await listVerificationsPage({ ...scope, after: page.data[1]?.id });
  expect(next.data.map((v) => v.to)).toEqual(["a@example.com"]);

  const organizationIds = [tenant.organization.id];
  expect(await purgeExpiredVerifications({ scope: { organizationIds } })).toBe(0);
  const later = new Date(Date.now() + 31 * 24 * 60 * 60_000);
  expect(await purgeExpiredVerifications({ now: later, scope: { organizationIds } })).toBe(3);
});
