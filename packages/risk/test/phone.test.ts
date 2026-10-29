import { describe, expect, test } from "bun:test";
import { createUsageGate } from "@coss/billing";
import { PLANS } from "@coss/billing/catalog";
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import type { RiskDeps } from "../src/assess.ts";
import { checkPhone } from "../src/lookups.ts";
import { fromTwilioLookup, normalizePhone, twilioPhoneLookup } from "../src/phone.ts";
import { sandboxPhoneData } from "../src/sandbox.ts";
import { fakePhoneLookup } from "../src/testing.ts";
import { setup } from "./helpers.ts";

describe("normalizePhone", () => {
  test("accepts E.164 with separators, nothing else", () => {
    expect(normalizePhone("+1 (415) 555-0123")).toBe("+14155550123");
    expect(normalizePhone("+44 7700.900123")).toBe("+447700900123");
    expect(normalizePhone("4155550123")).toBeNull();
    expect(normalizePhone("+0123456789")).toBeNull();
    expect(normalizePhone("+1 415 555 01234 5678")).toBeNull();
    expect(normalizePhone("+1415555012a")).toBeNull();
  });
});

describe("fromTwilioLookup", () => {
  const answer = {
    calling_country_code: "1",
    country_code: "US",
    phone_number: "+14155550123",
    national_format: "(415) 555-0123",
    valid: true,
    validation_errors: [],
    line_type_intelligence: {
      mobile_country_code: "311",
      mobile_network_code: "490",
      carrier_name: "Example Wireless",
      type: "nonFixedVoip",
      error_code: null,
    },
    sim_swap: null,
    url: "https://lookups.twilio.com/v2/PhoneNumbers/+14155550123",
  };

  test("maps line types and carriers", () => {
    expect(fromTwilioLookup(answer)).toEqual({
      valid: true,
      country: "US",
      lineType: "non_fixed_voip",
      carrier: { name: "Example Wireless", mobileCountryCode: "311", mobileNetworkCode: "490" },
      simSwap: null,
      missing: [],
    });
    const tollFree = fromTwilioLookup({
      ...answer,
      line_type_intelligence: {
        type: "tollFree",
        carrier_name: null,
        mobile_country_code: null,
        mobile_network_code: null,
        error_code: null,
      },
    });
    expect(tollFree).toMatchObject({ lineType: "toll_free", carrier: null });
    expect(
      fromTwilioLookup({ ...answer, line_type_intelligence: { type: "satellite" } }).lineType,
    ).toBe("unknown");
  });

  test("reads SIM swaps, and errors as missing parts", () => {
    const swapped = fromTwilioLookup({
      ...answer,
      sim_swap: {
        last_sim_swap: {
          last_sim_swap_date: "2026-10-28T10:18:50Z",
          swapped_period: "PT48H",
          swapped_in_period: true,
        },
        carrier_name: "Example Wireless",
        error_code: null,
      },
    });
    expect(swapped.simSwap).toEqual({
      swappedAt: "2026-10-28T10:18:50Z",
      recent: true,
      period: "PT48H",
    });
    const errors = fromTwilioLookup({
      ...answer,
      line_type_intelligence: { error_code: 60601 },
      sim_swap: { last_sim_swap: null, error_code: 60606 },
    });
    expect(errors).toMatchObject({ lineType: null, simSwap: null });
    expect(errors.missing).toEqual(["line_type", "sim_swap"]);
  });

  test("invalid numbers carry nothing else", () => {
    expect(
      fromTwilioLookup({ ...answer, valid: false, validation_errors: ["TOO_SHORT"] }),
    ).toMatchObject({ valid: false, country: null, lineType: null, carrier: null });
  });
});

describe("twilioPhoneLookup", () => {
  test("asks for the configured packages, caches complete answers, throws on failures", async () => {
    const requests: { url: string; authorization: string | null }[] = [];
    let status = 200;
    let lineError: number | null = null;
    const fetcher = (async (url: string, init?: RequestInit) => {
      requests.push({ url, authorization: new Headers(init?.headers).get("authorization") });
      return Response.json(
        {
          valid: true,
          country_code: "GB",
          line_type_intelligence: { type: "mobile", carrier_name: "EE", error_code: lineError },
        },
        { status },
      );
    }) as typeof fetch;
    let now = 0;
    const lookup = twilioPhoneLookup({
      accountSid: "ACtest",
      authToken: "secret",
      simSwap: true,
      fetch: fetcher,
      ttlMs: 1000,
      now: () => now,
    });
    const signal = AbortSignal.timeout(1000);
    expect(await lookup("+447700900123", signal)).toMatchObject({
      country: "GB",
      lineType: "mobile",
    });
    await lookup("+447700900123", signal);
    expect(requests).toEqual([
      {
        url: "https://lookups.twilio.com/v2/PhoneNumbers/%2B447700900123?Fields=line_type_intelligence,sim_swap",
        authorization: `Basic ${btoa("ACtest:secret")}`,
      },
    ]);
    now = 2000;
    await lookup("+447700900123", signal);
    expect(requests).toHaveLength(2);

    lineError = 60601;
    await lookup("+447700900124", signal);
    await lookup("+447700900124", signal);
    expect(requests).toHaveLength(4);

    status = 500;
    await expect(lookup("+447700900125", signal)).rejects.toThrow("500");
  });

  test("asks only for line types by default", async () => {
    const urls: string[] = [];
    const lookup = twilioPhoneLookup({
      accountSid: "ACtest",
      authToken: "secret",
      fetch: (async (url: string) => {
        urls.push(url);
        return Response.json({ valid: true });
      }) as typeof fetch,
    });
    await lookup("+447700900123", AbortSignal.timeout(1000));
    expect(urls[0]).toEndWith("?Fields=line_type_intelligence");
  });
});

describe("checkPhone", () => {
  async function phoneSetup(overrides: Partial<RiskDeps> = {}) {
    const { deps, live, organizationId } = await setup(overrides);
    const environment = { ...live, apiKeyId: null, userId: null };
    const usage = async () => {
      const rows = await db
        .select({ quantity: schema.billingUsage.quantity })
        .from(schema.billingUsage)
        .where(
          and(
            eq(schema.billingUsage.organizationId, organizationId),
            eq(schema.billingUsage.meter, "risk.phone_checks"),
          ),
        );
      return rows.reduce((sum, row) => sum + row.quantity, 0);
    };
    return { deps, environment, organizationId, usage };
  }

  test("meters live checks the provider answered, and nothing else", async () => {
    const phoneLookup = fakePhoneLookup({
      "+14155550124": "fail",
      "+14155550125": { lineType: null, carrier: null, missing: ["line_type"] },
      "+14155550126": { valid: false, country: null, lineType: null, carrier: null },
    });
    const { deps, environment, usage } = await phoneSetup({ phoneLookup });
    expect(await checkPhone(deps, environment, "+14155550123")).toMatchObject({
      line_type: "mobile",
    });
    // An answer that the number doesn't exist is still an answer.
    expect(await checkPhone(deps, environment, "+14155550126")).toMatchObject({ valid: false });
    expect(await usage()).toBe(2);

    expect(await checkPhone(deps, environment, "+14155550124")).toMatchObject({
      degraded: ["phone_data"],
    });
    expect(await checkPhone(deps, environment, "+14155550125")).toMatchObject({
      degraded: ["phone_data"],
    });
    expect(await checkPhone(deps, environment, "not a number")).toMatchObject({ valid: false });
    await checkPhone(deps, { ...environment, mode: "sandbox" }, "+12025550100");
    expect(await usage()).toBe(2);
  });

  test("Free stops at its allowance; failed lookups give their reservation back", async () => {
    const included = PLANS.free.includedUnits["risk.phone_checks"];
    const phoneLookup = fakePhoneLookup({ "+14155550124": "fail" });
    const { deps, environment, organizationId, usage } = await phoneSetup({
      phoneLookup,
      usage: createUsageGate(),
    });
    for (let i = 1; i < included; i++) await checkPhone(deps, environment, "+14155550123");
    await checkPhone(deps, environment, "+14155550124");
    await checkPhone(deps, environment, "+14155550123");
    expect(await usage()).toBe(included);
    const calls = phoneLookup.calls.length;
    await expect(checkPhone(deps, environment, "+14155550123")).rejects.toMatchObject({
      code: "usage_limit_exceeded",
    });
    // Refused before asking the provider.
    expect(phoneLookup.calls).toHaveLength(calls);
    expect(await usage()).toBe(included);
    const [quota] = await db
      .select({ reserved: schema.billingQuota.reserved })
      .from(schema.billingQuota)
      .where(
        and(
          eq(schema.billingQuota.organizationId, organizationId),
          eq(schema.billingQuota.meter, "risk.phone_checks"),
        ),
      );
    expect(quota?.reserved).toBe(included);
  });

  test("a billing hold pauses live checks, not sandbox ones", async () => {
    const { deps, environment, organizationId } = await phoneSetup();
    await db
      .insert(schema.billingHold)
      .values({ organizationId, reason: "delinquent", note: null });
    await expect(checkPhone(deps, environment, "+14155550123")).rejects.toMatchObject({
      code: "billing_hold",
    });
    expect(
      await checkPhone(deps, { ...environment, mode: "sandbox" }, "+12025550100"),
    ).toMatchObject({ line_type: "mobile" });
  });

  test("reports a slow provider as degraded", async () => {
    const { deps, environment } = await phoneSetup({
      phoneLookup: (_phone, signal) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
      phoneLookupTimeoutMs: 10,
    });
    expect(await checkPhone(deps, environment, "+14155550123")).toMatchObject({
      valid: true,
      line_type: null,
      degraded: ["phone_data"],
    });
  });

  test("lists parts the provider had no answer for", async () => {
    const { deps, environment } = await phoneSetup({
      phoneLookup: fakePhoneLookup({ "+14155550123": { missing: ["sim_swap"] } }),
    });
    expect(await checkPhone(deps, environment, "+14155550123")).toMatchObject({
      line_type: "mobile",
      degraded: ["sim_swap"],
    });
  });
});

describe("sandboxPhoneData", () => {
  test("knows only the fictional 555-01xx numbers", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(sandboxPhoneData("+12025550104", now)?.simSwap).toEqual({
      swappedAt: "2026-10-29T06:00:00.000Z",
      recent: true,
      period: "PT48H",
    });
    expect(sandboxPhoneData("+12025550100", now)?.simSwap).toMatchObject({ recent: false });
    expect(sandboxPhoneData("+12025550101", now)).toMatchObject({
      lineType: "landline",
      simSwap: null,
    });
    expect(sandboxPhoneData("+12025550200", now)).toBeNull();
    expect(sandboxPhoneData("+120255501001", now)).toBeNull();
  });
});
