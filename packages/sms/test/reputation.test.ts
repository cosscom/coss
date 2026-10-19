import { expect, test } from "bun:test";
import { DEFAULT_REPUTATION_POLICY } from "@coss/reputation";
import { createTestTenant } from "@coss/tenancy/testing";
import { receiveSms } from "../src/received.ts";
import { smsReputationChecks } from "../src/reputation-checks.ts";
import { SendSmsRequest } from "../src/schemas.ts";
import { createTestSmsNumber, dispatchingSmsService, testPhoneNumber } from "../src/testing.ts";

test("opt-outs and carrier filtering are rated over live messages that reached a carrier", async () => {
  const tenant = await createTestTenant();
  const number = await createTestSmsNumber(tenant.organization.id);
  const service = dispatchingSmsService();
  const environment = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.production.id,
    mode: "live" as const,
  };
  const recipients = Array.from({ length: 4 }, () => testPhoneNumber());
  for (const to of recipients) {
    await service.send({
      environment,
      apiKeyId: null,
      params: SendSmsRequest.parse({ from: number.phoneNumber, to, body: "Hi" }),
    });
  }
  const [first] = recipients;
  if (!first) throw new Error("no recipient");
  await receiveSms({
    provider: "fake",
    providerMessageId: `stop-${crypto.randomUUID()}`,
    from: first,
    to: number.phoneNumber,
    body: "STOP",
    occurredAt: new Date(),
  });
  const context = {
    organizationId: tenant.organization.id,
    now: new Date(),
    windowStart: new Date(Date.now() - 60 * 60 * 1000),
    policy: {
      ...DEFAULT_REPUTATION_POLICY,
      smsOptOutRate: { warning: 0.1, suspend: 0.5, minimumRecipients: 1 },
    },
  };
  const [optOut, filtered] = await Promise.all(
    smsReputationChecks.map((check) => check.evaluate(context)),
  );
  expect(optOut).toMatchObject({
    trigger: "sms_opt_out_rate",
    count: 1,
    volume: 4,
    severity: "warning",
  });
  expect(filtered).toMatchObject({
    trigger: "sms_filtered_rate",
    count: 0,
    volume: 4,
    severity: "ok",
  });
});
