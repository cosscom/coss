import { describe, expect, test } from "bun:test";
import type { PlanGate } from "@coss/billing/gate";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { eq, sql } from "drizzle-orm";
import {
  advanceDueSmsRegistrations,
  attachPendingSmsNumbers,
  buySmsNumber,
  chargeDueSmsFees,
  createSmsRegistration,
  ensureSmsSubaccount,
  listSmsRegistrations,
  oneMonthAfter,
  releaseOrganizationSmsResources,
  releaseSmsNumber,
  type SmsSenderDeps,
  searchSmsNumbers,
} from "../src/provisioning.ts";
import { SmsRegistrationInput } from "../src/schemas.ts";
import { authorizeLiveSmsSender } from "../src/senders.ts";
import { testPhoneNumber } from "../src/testing.ts";
import { FakeTwilioApi } from "../src/twilio/fake.ts";

const { billingUsage, smsAccount, smsNumber } = schema;

/** A plan gate that allows `numbers` SMS numbers (`null`: any number). */
function plansAllowing(numbers: number | null): PlanGate {
  return {
    async requireFeature() {},
    async limit() {
      return numbers;
    },
    async requireCapacity(_org, _limit, current) {
      if (numbers !== null && current >= numbers) {
        throw Object.assign(new Error("limit"), { code: "plan_limit_reached" });
      }
    },
  };
}

function deps(twilio = new FakeTwilioApi()): SmsSenderDeps & { twilio: FakeTwilioApi } {
  return {
    provider: "fake",
    twilio,
    secretsKeys: TEST_SECRETS_KEYS,
    subaccountPrefix: "coss-test",
    callbackBaseUrl: "https://api.coss.test",
    plans: plansAllowing(null),
  };
}

/** Fails adding numbers to messaging services until `working` is set. */
class FlakyServiceTwilio extends FakeTwilioApi {
  working = false;
  override async addNumberToService(
    account: { accountSid: string; authToken: string },
    serviceSid: string,
    numberSid: string,
  ) {
    if (!this.working) throw new Error("Twilio unreachable");
    await super.addNumberToService(account, serviceSid, numberSid);
  }
}

const PROFILE = {
  legalName: "Acme, Inc.",
  companyType: "PRIVATE_PROFIT",
  taxId: "12-3456789",
  taxIdType: "EIN",
  industry: "TECHNOLOGY",
  website: "https://acme.test",
  street: "1 Main St",
  city: "San Francisco",
  region: "CA",
  postalCode: "94105",
  country: "US",
  contact: {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@acme.test",
    phone: "+14155550100",
    title: "CTO",
    jobPosition: "Director",
  },
};

const CAMPAIGN = {
  useCase: "ACCOUNT_NOTIFICATION",
  description: "Sign-in codes and account notifications for Acme's customers.",
  messageFlow: "Customers enter their mobile number in Acme's sign-up form and confirm it.",
  samples: [
    "Your Acme code is 123456. It expires in 10 minutes.",
    "Your Acme password was changed.",
  ],
  hasEmbeddedLinks: false,
  hasEmbeddedPhone: false,
};

async function fees(organizationId: string) {
  return db
    .select({
      meter: billingUsage.meter,
      dimension: billingUsage.dimension,
      quantity: sql<number>`sum(${billingUsage.quantity})::int`,
    })
    .from(billingUsage)
    .where(eq(billingUsage.organizationId, organizationId))
    .groupBy(billingUsage.meter, billingUsage.dimension)
    .orderBy(billingUsage.meter, billingUsage.dimension);
}

/** Each organization's own clock, moved an hour per round, so later calls continue from it. */
const clocks = new Map<string, number>();

async function advanceUntilSettled(organizationId: string, d: SmsSenderDeps) {
  const scope = { organizationIds: [organizationId] };
  let now = clocks.get(organizationId) ?? Date.now();
  for (let i = 0; i < 20; i++) {
    now += 60 * 60 * 1000;
    if ((await advanceDueSmsRegistrations(d, { now: new Date(now), scope })) === 0) break;
  }
  clocks.set(organizationId, now);
  return listSmsRegistrations(organizationId);
}

describe("US A2P 10DLC", () => {
  test("a registration goes through every step, then its numbers can send", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const d = deps();
    const [available] = await searchSmsNumbers(org, { kind: "local", country: "US" }, d);
    if (!available) throw new Error("no number");
    const number = await buySmsNumber(
      org,
      { phoneNumber: available.phoneNumber, kind: "local" },
      d,
    );
    await expect(
      authorizeLiveSmsSender({
        organizationId: org,
        from: number.phoneNumber,
        toCountry: "US",
        provider: "fake",
      }),
    ).rejects.toMatchObject({ code: "sender_not_ready" });
    await createSmsRegistration(
      org,
      SmsRegistrationInput.parse({
        kind: "us_10dlc",
        brandType: "standard",
        profile: PROFILE,
        campaign: CAMPAIGN,
      }),
      d,
    );
    const [registration] = await advanceUntilSettled(org, d);
    expect(registration).toMatchObject({ status: "approved", step: "done" });
    expect(registration?.campaignSid).toBeTruthy();
    expect(d.twilio.calls.map((call) => call.method)).toEqual([
      "createSubaccount",
      "searchNumbers",
      "buyNumber",
      "createCustomerProfile",
      "createTrustProduct",
      "createBrand",
      "createMessagingService",
      "createCampaign",
      "addNumberToService",
    ]);
    expect(
      await authorizeLiveSmsSender({
        organizationId: org,
        from: number.phoneNumber,
        toCountry: "US",
        provider: "fake",
      }),
    ).toMatchObject({
      numberId: number.id,
      route: { messagingServiceSid: registration?.messagingServiceSid },
    });
    expect(await fees(org)).toEqual([
      { meter: "sms.numbers", dimension: "type=local", quantity: 1 },
      { meter: "sms.registrations", dimension: "fee=brand", quantity: 1 },
      { meter: "sms.registrations", dimension: "fee=brand_vetting", quantity: 1 },
      { meter: "sms.registrations", dimension: "fee=campaign_monthly", quantity: 1 },
      { meter: "sms.registrations", dimension: "fee=campaign_vetting", quantity: 1 },
    ]);
    // A month on, the number and the campaign are charged again.
    const later = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    expect(await chargeDueSmsFees({ now: later, scope: { organizationIds: [org] } })).toBe(2);
    expect(await chargeDueSmsFees({ now: later, scope: { organizationIds: [org] } })).toBe(0);
    expect(await fees(org)).toContainEqual({
      meter: "sms.numbers",
      dimension: "type=local",
      quantity: 2,
    });
    await expect(
      createSmsRegistration(
        org,
        SmsRegistrationInput.parse({
          kind: "us_10dlc",
          brandType: "standard",
          profile: PROFILE,
          campaign: CAMPAIGN,
        }),
        d,
      ),
    ).rejects.toMatchObject({ code: "registration_locked" });
  });

  test("a rejected business is told why and can register again", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const d = deps();
    await createSmsRegistration(
      org,
      SmsRegistrationInput.parse({
        kind: "us_10dlc",
        brandType: "low_volume_standard",
        profile: { ...PROFILE, legalName: "Acme [reject]" },
        campaign: CAMPAIGN,
      }),
      d,
    );
    const [registration] = await advanceUntilSettled(org, d);
    expect(registration).toMatchObject({ status: "rejected" });
    expect(registration?.rejectionReason).toContain("Simulated rejection");
    expect(
      (
        await createSmsRegistration(
          org,
          SmsRegistrationInput.parse({
            kind: "us_10dlc",
            brandType: "low_volume_standard",
            profile: PROFILE,
            campaign: CAMPAIGN,
          }),
          d,
        )
      ).status,
    ).toBe("submitted");
  });

  test("reviews that take time are polled", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const twilio = new FakeTwilioApi();
    twilio.hold();
    const d = deps(twilio);
    await createSmsRegistration(
      org,
      SmsRegistrationInput.parse({
        kind: "us_10dlc",
        brandType: "standard",
        profile: PROFILE,
        campaign: CAMPAIGN,
      }),
      d,
    );
    const [pending] = await advanceUntilSettled(org, d);
    expect(pending).toMatchObject({ status: "in_review", step: "customer_profile" });
    twilio.decide(pending?.customerProfileSid ?? "", {
      status: "rejected",
      reason: "EIN mismatch",
    });
    const [rejected] = await advanceUntilSettled(org, d);
    expect(rejected).toMatchObject({ status: "rejected", rejectionReason: "EIN mismatch" });
  });
});

test("toll-free: a number is verified, then sends to the US and Canada only", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const d = deps();
  const [available] = await searchSmsNumbers(org, { kind: "toll_free", country: "US" }, d);
  if (!available) throw new Error("no number");
  const number = await buySmsNumber(
    org,
    { phoneNumber: available.phoneNumber, kind: "toll_free" },
    d,
  );
  await expect(
    createSmsRegistration(
      org,
      SmsRegistrationInput.parse({
        kind: "toll_free",
        numberId: number.id,
        profile: PROFILE,
        campaign: { ...CAMPAIGN, optInProofUrl: "https://acme.test/opt-in.png" },
      }),
      d,
    ),
  ).resolves.toMatchObject({ kind: "toll_free", numberId: number.id });
  const [registration] = await advanceUntilSettled(org, d);
  expect(registration).toMatchObject({ status: "approved" });
  await db
    .update(smsAccount)
    .set({ allowedCountries: ["US", "CA", "GB"] })
    .where(eq(smsAccount.organizationId, org));
  await expect(
    authorizeLiveSmsSender({
      organizationId: org,
      from: number.phoneNumber,
      toCountry: "GB",
      provider: "fake",
    }),
  ).rejects.toMatchObject({ code: "country_not_allowed" });
  expect(
    await authorizeLiveSmsSender({
      organizationId: org,
      from: number.phoneNumber,
      toCountry: "CA",
      provider: "fake",
    }),
  ).toMatchObject({ numberId: number.id });
});

test("plans cap numbers; released numbers stop sending; deletion closes the subaccount", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const d: SmsSenderDeps = {
    ...deps(),
    plans: {
      async requireFeature() {},
      async limit() {
        return 1;
      },
      async requireCapacity(_org, _limit, current) {
        if (current >= 1) throw Object.assign(new Error("limit"), { code: "plan_limit_reached" });
      },
    },
  };
  const first = await buySmsNumber(org, { phoneNumber: testPhoneNumber(), kind: "local" }, d);
  await expect(
    buySmsNumber(org, { phoneNumber: testPhoneNumber(), kind: "local" }, d),
  ).rejects.toMatchObject({ code: "plan_limit_reached" });
  await releaseSmsNumber(org, first.id, d);
  expect(await db.select().from(smsNumber).where(eq(smsNumber.organizationId, org))).toEqual([]);
  const account = await ensureSmsSubaccount(org, d);
  await releaseOrganizationSmsResources(org, d);
  const [closed] = await db.select().from(smsAccount).where(eq(smsAccount.organizationId, org));
  expect(closed?.status).toBe("closed");
  expect((d.twilio as FakeTwilioApi).calls.at(-1)).toEqual({
    method: "closeSubaccount",
    args: [account.accountSid],
  });
  expect(oneMonthAfter(new Date("2026-01-31T10:00:00Z")).toISOString()).toBe(
    "2026-02-28T10:00:00.000Z",
  );
});

test("plans without SMS numbers can't register senders or buy numbers", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const d = { ...deps(), plans: plansAllowing(0) };
  await expect(
    createSmsRegistration(
      org,
      SmsRegistrationInput.parse({
        kind: "us_10dlc",
        brandType: "standard",
        profile: PROFILE,
        campaign: CAMPAIGN,
      }),
      d,
    ),
  ).rejects.toMatchObject({ code: "plan_required" });
  await expect(
    buySmsNumber(org, { phoneNumber: testPhoneNumber(), kind: "local" }, d),
  ).rejects.toMatchObject({ code: "plan_required" });
  expect(await listSmsRegistrations(org)).toEqual([]);
  expect(d.twilio.calls).toEqual([]);
});

test("a number is bought as what it is, not as what the form said", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const d = deps();
  const [tollFree] = await searchSmsNumbers(org, { kind: "toll_free", country: "US" }, d);
  if (!tollFree) throw new Error("no number");
  await expect(
    buySmsNumber(org, { phoneNumber: tollFree.phoneNumber, kind: "local" }, d),
  ).rejects.toMatchObject({ code: "number_unavailable" });
  expect(d.twilio.calls.map((call) => call.method)).not.toContain("buyNumber");
  const number = await buySmsNumber(
    org,
    { phoneNumber: tollFree.phoneNumber, kind: "toll_free" },
    d,
  );
  expect(number.kind).toBe("toll_free");
});

test("a number its messaging service didn't take is pending until the worker adds it", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const twilio = new FlakyServiceTwilio();
  twilio.working = true;
  const d = deps(twilio);
  await createSmsRegistration(
    org,
    SmsRegistrationInput.parse({
      kind: "us_10dlc",
      brandType: "low_volume_standard",
      profile: PROFILE,
      campaign: CAMPAIGN,
    }),
    d,
  );
  const [registration] = await advanceUntilSettled(org, d);
  expect(registration?.status).toBe("approved");
  twilio.working = false;
  const number = await buySmsNumber(org, { phoneNumber: testPhoneNumber(), kind: "local" }, d);
  expect(number.status).toBe("pending");
  const send = () =>
    authorizeLiveSmsSender({
      organizationId: org,
      from: number.phoneNumber,
      toCountry: "US",
      provider: "fake",
    });
  await expect(send()).rejects.toMatchObject({ code: "sender_not_ready" });
  const scope = { organizationIds: [org] };
  const later = new Date(Date.now() + 5 * 60 * 1000);
  expect(await attachPendingSmsNumbers(d, { now: later, scope })).toBe(0);
  twilio.working = true;
  expect(await attachPendingSmsNumbers(d, { now: later, scope })).toBe(1);
  expect(await send()).toMatchObject({
    numberId: number.id,
    route: { messagingServiceSid: registration?.messagingServiceSid },
  });
});
