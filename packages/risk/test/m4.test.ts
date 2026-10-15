import { describe, expect, test } from "bun:test";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { getRiskCalibration, suggestedWeight } from "../src/calibration.ts";
import { readDeviceToken } from "../src/device.ts";
import { forgetRiskUser, recordRiskFeedback } from "../src/feedback.ts";
import { checkIp } from "../src/lookups.ts";
import { ipinfoPrivacyLookup } from "../src/privacy.ts";
import { getRiskAssessmentRow } from "../src/read.ts";
import { createRiskRule } from "../src/rules.ts";
import {
  CreateRiskAssessmentRequest,
  CreateRiskRuleRequest,
  REASONS,
  UpdateRiskSettingsRequest,
} from "../src/schemas.ts";
import { getRiskSettings, updateRiskSettings } from "../src/settings.ts";
import { fakeIpPrivacy, TEST_IPS, testDeviceToken } from "../src/testing.ts";
import { setup } from "./helpers.ts";

const codes = (assessment: { reasons: { code: string }[] }) =>
  assessment.reasons.map((reason) => reason.code);
const actor = { source: "api" as const, actorId: null };

describe("checkout", () => {
  const card = { fingerprint: "card_fp_1", country: "US", funding: "prepaid" } as const;

  test("compares the card with the IP and the billing address", async () => {
    const { assess } = await setup();
    const { assessment } = await assess({
      event: "checkout",
      user: { id: "buyer" },
      ip: TEST_IPS.residential,
      checkout: { amount: 4999, currency: "EUR", card, billing_country: "GB" },
    });
    expect(codes(assessment)).toEqual(
      expect.arrayContaining([
        "checkout.card_country_mismatch",
        "checkout.billing_country_mismatch",
        "checkout.prepaid_card",
      ]),
    );
    expect(assessment.signals.checkout).toEqual({
      amount: 4999,
      currency: "EUR",
      card_country: "US",
      card_funding: "prepaid",
      billing_country: "GB",
      shipping_country: null,
    });
    // The fingerprint is only kept as a hash.
    expect(JSON.stringify(assessment)).not.toContain("card_fp_1");

    const home = await assess({
      event: "checkout",
      ip: TEST_IPS.residential,
      checkout: {
        amount: 100,
        currency: "EUR",
        card: { country: "DE", funding: "debit" },
        billing_country: "DE",
      },
    });
    expect(codes(home.assessment).filter((code) => code.startsWith("checkout."))).toEqual([]);
  });

  test("checkout fields only with checkout events, in upper-case ISO codes", () => {
    expect(
      CreateRiskAssessmentRequest.safeParse({
        event: "signup",
        checkout: { amount: 1, currency: "USD" },
      }).success,
    ).toBe(false);
    expect(
      CreateRiskAssessmentRequest.safeParse({
        event: "checkout",
        checkout: { amount: 1, currency: "usd" },
      }).success,
    ).toBe(false);
    expect(
      CreateRiskAssessmentRequest.safeParse({
        event: "checkout",
        checkout: { amount: -1, currency: "USD" },
      }).success,
    ).toBe(false);
  });

  test("counts checkouts per card and per IP", async () => {
    const { assess } = await setup();
    let last: Awaited<ReturnType<typeof assess>> | undefined;
    for (let i = 0; i < 10; i++) {
      last = await assess({
        event: "checkout",
        user: { id: `buyer-${i}` },
        ip: TEST_IPS.residential,
        checkout: { amount: 100, currency: "USD", card: { fingerprint: "testing-card" } },
      });
    }
    expect(last?.assessment.signals.velocity).toMatchObject({ card_24h: 10, ip_1h: 10 });
    expect(codes(last?.assessment ?? { reasons: [] })).toEqual(
      expect.arrayContaining(["velocity.checkouts_per_card_24h", "velocity.checkouts_per_ip_1h"]),
    );
  });

  test("a card reported as fraud is remembered, and forgotten with its user", async () => {
    const { assess, deps, live } = await setup();
    const checkout = { amount: 100, currency: "USD", card: { fingerprint: "stolen" } };
    const first = await assess({ event: "checkout", user: { id: "thief" }, checkout });
    await recordRiskFeedback(deps.hash, live, first.assessment.id, { outcome: "fraud" }, actor);
    // Another user, another address: the card gives it away.
    const again = await assess({
      event: "checkout",
      user: { id: "someone-else" },
      ip: TEST_IPS.neighbour,
      checkout,
    });
    expect(codes(again.assessment)).toContain("history.fraud_card");

    await forgetRiskUser(deps.hash, live, "thief");
    const row = await getRiskAssessmentRow(live, first.assessment.id);
    expect(row?.cardHash).toBeNull();
    const after = await assess({ event: "checkout", user: { id: "third" }, checkout });
    expect(codes(after.assessment)).not.toContain("history.fraud_card");
  });
});

describe("devices", () => {
  test("reads a token: signals, automation, invalid and stale tokens", async () => {
    const { assess } = await setup();
    const { assessment } = await assess({
      event: "signup",
      device: { token: testDeviceToken({ id: "device-aaaaaaaaaaaa" }) },
    });
    expect(assessment.signals.device).toEqual({
      valid: true,
      automation: false,
      timezone: "Europe/Berlin",
      language: "de-DE",
      platform: "MacIntel",
      screen: "1512x982",
      touch: false,
    });
    expect(codes(assessment).filter((code) => code.startsWith("device."))).toEqual([]);

    const robot = await assess({
      event: "signup",
      device: { token: testDeviceToken({ id: "device-bbbbbbbbbbbb", automation: true }) },
    });
    expect(codes(robot.assessment)).toContain("device.automation");

    for (const token of [
      "garbage",
      "cd1.not-json",
      testDeviceToken({ id: "short" }),
      testDeviceToken({ id: "device-cccccccccccc", at: Date.now() - 25 * 60 * 60_000 }),
      testDeviceToken({ id: "device-dddddddddddd", at: Date.now() + 60 * 60_000 }),
    ]) {
      const { assessment: invalid } = await assess({ event: "signup", device: { token } });
      expect(codes(invalid)).toContain("device.invalid");
      expect(invalid.signals.device?.valid).toBe(false);
    }
  });

  test("a device behind a second account is a duplicate; blocked sign-ups don't claim it", async () => {
    const { assess, live } = await setup();
    const device = { token: testDeviceToken({ id: "shared-device-0001" }) };
    const first = await assess({ event: "signup", user: { id: "u1" }, device });
    expect(codes(first.assessment)).not.toContain("duplicate.device");
    // The same user again isn't a duplicate.
    const same = await assess({ event: "signup", user: { id: "u1" }, device });
    expect(codes(same.assessment)).not.toContain("duplicate.device");
    const second = await assess({ event: "signup", user: { id: "u2" }, device });
    expect(second.assessment.reasons).toContainEqual(
      expect.objectContaining({
        code: "duplicate.device",
        previous_user: "u1",
        previous_assessment: first.assessment.id,
      }),
    );
    expect(second.assessment.signals.velocity).toMatchObject({ device_24h: 3 });
    expect(codes(second.assessment)).toContain("velocity.signups_per_device_24h");

    // A blocked sign-up from a new device never makes it "known".
    await createRiskRule(
      live,
      CreateRiskRuleRequest.parse({
        name: "Block u3",
        conditions: [{ field: "device.timezone", operator: "eq", value: "Asia/Tokyo" }],
        action: "block",
      }),
    );
    const tokyo = { token: testDeviceToken({ id: "tokyo-device-0001", timezone: "Asia/Tokyo" }) };
    const blocked = await assess({ event: "signup", user: { id: "u3" }, device: tokyo });
    expect(blocked.assessment.decision).toBe("block");
    const later = await assess({
      event: "signup",
      user: { id: "u4" },
      device: { token: testDeviceToken({ id: "tokyo-device-0001" }) },
    });
    expect(codes(later.assessment)).not.toContain("duplicate.device");
  });

  test("a device reported as fraud is remembered", async () => {
    const { assess, deps, live } = await setup();
    const device = { token: testDeviceToken({ id: "fraud-device-0001" }) };
    const first = await assess({ event: "login", user: { id: "u1" }, device });
    await recordRiskFeedback(deps.hash, live, first.assessment.id, { outcome: "abuse" }, actor);
    const again = await assess({ event: "message", device });
    expect(codes(again.assessment)).toContain("history.fraud_device");
  });

  test("sandbox tokens", async () => {
    const { assess, sandbox } = await setup();
    const first = await assess(
      { event: "signup", user: { id: "a" }, device: { token: "test-device:laptop" } },
      { env: sandbox },
    );
    expect(first.assessment.signals.device?.valid).toBe(true);
    const second = await assess(
      { event: "signup", user: { id: "b" }, device: { token: "test-device:laptop" } },
      { env: sandbox },
    );
    expect(codes(second.assessment)).toContain("duplicate.device");
    const robot = await assess(
      { event: "signup", device: { token: "test-device-automated" } },
      { env: sandbox },
    );
    expect(codes(robot.assessment)).toContain("device.automation");
    // Live environments don't know the fixtures.
    expect(readDeviceToken("test-device:laptop", { sandbox: false }).signals.valid).toBe(false);
  });
});

describe("IP privacy data", () => {
  test("a provider's VPN replaces the network guess; proxies and relays", async () => {
    const ipPrivacy = fakeIpPrivacy({
      [TEST_IPS.vpn]: { vpn: true, service: "NordVPN" },
      [TEST_IPS.residential]: { proxy: true },
      [TEST_IPS.neighbour]: { relay: true, service: "iCloud Private Relay" },
    });
    const { assess } = await setup({ ipPrivacy });
    const vpn = await assess({ event: "signup", ip: TEST_IPS.vpn });
    expect(vpn.assessment.reasons).toContainEqual(
      expect.objectContaining({ code: "ip.vpn", provider: "NordVPN" }),
    );
    expect(codes(vpn.assessment)).not.toContain("ip.vpn_network");
    expect(vpn.assessment.signals.ip?.privacy).toEqual({
      vpn: true,
      proxy: false,
      relay: false,
      service: "NordVPN",
    });
    expect(
      codes((await assess({ event: "signup", ip: TEST_IPS.residential })).assessment),
    ).toContain("ip.proxy");
    expect(codes((await assess({ event: "signup", ip: TEST_IPS.neighbour })).assessment)).toContain(
      "ip.relay",
    );
    // An address the provider doesn't know keeps the network's signals.
    const unknown = await assess({ event: "signup", ip: TEST_IPS.hosting });
    expect(unknown.assessment.signals.ip?.privacy).toBeNull();
    expect(codes(unknown.assessment)).toContain("ip.hosting_provider");
  });

  test("without a provider the network guess stays; a failing one is degraded", async () => {
    const plain = await setup();
    const guess = await plain.assess({ event: "signup", ip: TEST_IPS.vpn });
    expect(codes(guess.assessment)).toContain("ip.vpn_network");
    expect(guess.assessment.degraded).not.toContain("ip_privacy");

    const failing = await setup({ ipPrivacy: fakeIpPrivacy({ [TEST_IPS.vpn]: "fail" }) });
    const { assessment } = await failing.assess({ event: "signup", ip: TEST_IPS.vpn });
    expect(assessment.degraded).toContain("ip_privacy");
    expect(codes(assessment)).toContain("ip.vpn_network");

    const slow = await setup({
      ipPrivacyTimeoutMs: 20,
      ipPrivacy: (_ip, signal) =>
        new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
    });
    expect(
      (await slow.assess({ event: "signup", ip: TEST_IPS.tor })).assessment.degraded,
    ).toContain("ip_privacy");
  });

  test("checkIp and sandbox fixtures", async () => {
    const { deps, live, sandbox } = await setup({
      ipPrivacy: fakeIpPrivacy({ [TEST_IPS.vpn]: { vpn: true } }),
    });
    expect(await checkIp(deps, live, TEST_IPS.vpn)).toMatchObject({
      privacy: { vpn: true, proxy: false, relay: false, service: null },
      degraded: [],
    });
    expect(await checkIp(deps, sandbox, "192.0.2.4")).toMatchObject({
      privacy: { vpn: false, proxy: true, relay: false },
    });
    expect(await checkIp(deps, sandbox, "192.0.2.5")).toMatchObject({
      privacy: { relay: true, service: "iCloud Private Relay" },
    });
    // Sandboxes never call the (paid) provider.
    const calls = (deps.ipPrivacy as ReturnType<typeof fakeIpPrivacy>).calls.length;
    expect(await checkIp(deps, sandbox, TEST_IPS.vpn)).toMatchObject({ privacy: null });
    expect((deps.ipPrivacy as ReturnType<typeof fakeIpPrivacy>).calls).toHaveLength(calls);
  });

  test("IPinfo: bearer token, cache, unknown addresses, failures, private addresses", async () => {
    const requests: { url: string; authorization: string | null }[] = [];
    let status = 200;
    const fetcher = (async (url: string, init?: RequestInit) => {
      requests.push({
        url,
        authorization: new Headers(init?.headers).get("authorization"),
      });
      if (status !== 200) return new Response("nope", { status });
      return Response.json({
        vpn: true,
        proxy: false,
        tor: false,
        relay: false,
        service: "Mullvad",
      });
    }) as typeof fetch;
    let now = 0;
    const lookup = ipinfoPrivacyLookup({
      token: "tok",
      fetch: fetcher,
      ttlMs: 1000,
      now: () => now,
    });
    const signal = AbortSignal.timeout(1000);
    expect(await lookup("89.187.1.1", signal)).toEqual({
      vpn: true,
      proxy: false,
      relay: false,
      service: "Mullvad",
    });
    await lookup("89.187.1.1", signal);
    expect(requests).toEqual([
      { url: "https://ipinfo.io/89.187.1.1/privacy", authorization: "Bearer tok" },
    ]);
    now = 2000;
    await lookup("89.187.1.1", signal);
    expect(requests).toHaveLength(2);
    expect(await lookup("10.0.0.1", signal)).toBeNull();
    expect(requests).toHaveLength(2);
    status = 404;
    expect(await lookup("81.2.69.142", signal)).toBeNull();
    status = 500;
    await expect(lookup("81.2.69.200", signal)).rejects.toThrow("500");
  });
});

describe("reason weights", () => {
  test("an environment's weights replace the catalog's, and go back with null", async () => {
    const { assess, live } = await setup();
    const parse = (input: unknown) => UpdateRiskSettingsRequest.parse(input);
    const before = await assess({ event: "signup", ip: TEST_IPS.aws });
    expect(before.assessment.score).toBe(REASONS["ip.hosting_provider"].weight);

    await updateRiskSettings(
      live,
      parse({ reason_weights: { "ip.hosting_provider": 0.9 } }),
      TEST_SECRETS_KEYS,
    );
    expect((await getRiskSettings(live)).reason_weights).toEqual({ "ip.hosting_provider": 0.9 });
    const heavier = await assess({ event: "signup", ip: TEST_IPS.aws });
    expect(heavier.assessment.score).toBe(0.9);
    expect(heavier.assessment.decision).toBe("block");

    await updateRiskSettings(
      live,
      parse({ reason_weights: { "ip.hosting_provider": null } }),
      TEST_SECRETS_KEYS,
    );
    expect((await getRiskSettings(live)).reason_weights).toEqual({});

    expect(UpdateRiskSettingsRequest.safeParse({ reason_weights: { "ip.tor": 1 } }).success).toBe(
      false,
    );
    expect(
      UpdateRiskSettingsRequest.safeParse({ reason_weights: { "list.blocked": 0.5 } }).success,
    ).toBe(false);
  });
});

describe("calibration", () => {
  test("suggested weights pull precision toward the default", () => {
    const tally = (fraud: number, legitimate: number) => ({
      fired: fraud + legitimate,
      fraud,
      legitimate,
    });
    expect(suggestedWeight("ip.hosting_provider", tally(5, 14))).toBeNull();
    // (5 + 10 × 0.25) / (25 + 10)
    expect(suggestedWeight("ip.hosting_provider", tally(5, 20))).toBe(0.21);
    expect(suggestedWeight("ip.hosting_provider", tally(1000, 0))).toBe(0.99);
    expect(suggestedWeight("ip.private", tally(100, 0))).toBeNull();
  });

  test("counts reasons and rules against feedback", async () => {
    const { assess, deps, live } = await setup();
    const rule = await createRiskRule(
      live,
      CreateRiskRuleRequest.parse({
        name: "Review logins from hosting",
        events: ["login"],
        conditions: [{ field: "ip.hosting", operator: "is", value: true }],
        action: "review",
      }),
    );
    const outcomes = [
      ...Array<"fraud">(5).fill("fraud"),
      ...Array<"legitimate">(20).fill("legitimate"),
    ];
    for (const [i, outcome] of outcomes.entries()) {
      const { assessment } = await assess({
        event: "signup",
        ip: TEST_IPS.aws,
        user: { id: `s${i}` },
      });
      await recordRiskFeedback(deps.hash, live, assessment.id, { outcome }, actor);
    }
    for (let i = 0; i < 3; i++) {
      const { assessment } = await assess({
        event: "login",
        user: { id: `l${i}` },
        ip: TEST_IPS.hosting,
      });
      if (i === 0) {
        await recordRiskFeedback(deps.hash, live, assessment.id, { outcome: "fraud" }, actor);
      }
    }
    await assess({ event: "signup", ip: TEST_IPS.tor });

    const calibration = await getRiskCalibration(live);
    expect(calibration).toMatchObject({ object: "risk_calibration", assessments: 29, labeled: 26 });
    const hosting = calibration.reasons.find((r) => r.code === "ip.hosting_provider");
    expect(hosting).toEqual({
      code: "ip.hosting_provider",
      fired: 28,
      fraud: 6,
      legitimate: 20,
      precision: 0.231,
      default_weight: 0.25,
      weight: 0.25,
      // (6 + 10 × 0.25) / (26 + 10)
      suggested_weight: 0.24,
    });
    expect(calibration.reasons.find((r) => r.code === "ip.tor")).toMatchObject({
      fired: 1,
      precision: null,
      suggested_weight: null,
    });
    expect(calibration.rules).toEqual([
      {
        rule: rule?.id ?? "missing",
        name: "Review logins from hosting",
        matched: 3,
        fraud: 1,
        legitimate: 0,
        precision: 1,
      },
    ]);
    // Decisions aren't calibrated.
    expect(calibration.reasons.map((r) => r.code)).not.toContain("rule.matched");
  });
});
