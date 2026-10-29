import { describe, expect, test } from "bun:test";
import { checkPhone } from "../src/lookups.ts";
import { fromTwilioLookup, normalizePhone, twilioPhoneLookup } from "../src/phone.ts";
import { sandboxPhoneData } from "../src/sandbox.ts";
import { fakePhoneLookup, testRiskDeps } from "../src/testing.ts";

const live = { organizationId: "org_test", mode: "live" } as const;

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
  test("reports a slow provider as degraded", async () => {
    const deps = testRiskDeps({
      phoneLookup: (_phone, signal) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
      phoneLookupTimeoutMs: 10,
    });
    expect(await checkPhone(deps, live, "+14155550123")).toMatchObject({
      valid: true,
      line_type: null,
      degraded: ["phone_data"],
    });
  });

  test("lists parts the provider had no answer for", async () => {
    const deps = testRiskDeps({
      phoneLookup: fakePhoneLookup({ "+14155550123": { missing: ["sim_swap"] } }),
    });
    expect(await checkPhone(deps, live, "+14155550123")).toMatchObject({
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
