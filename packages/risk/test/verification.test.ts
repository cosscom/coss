import { describe, expect, test } from "bun:test";
import { addRiskListEntry } from "../src/lists.ts";
import { TEST_IPS } from "../src/testing.ts";
import {
  checkVerificationRisk,
  phonePrefix,
  recordVerificationApproval,
  uncountVerificationStart,
  type VerificationDestination,
} from "../src/verification.ts";
import { setup } from "./helpers.ts";

function sms(phoneNumber: string, lineType = "mobile", country = "GB"): VerificationDestination {
  return { channel: "sms", phoneNumber, country, lineType };
}

describe("checkVerificationRisk", () => {
  test("allows an ordinary request", async () => {
    const { deps, live } = await setup();
    expect(
      await checkVerificationRisk(deps, live, {
        destination: sms("+447400123456"),
        ip: TEST_IPS.residential,
        userId: "user_1",
      }),
    ).toMatchObject({ decision: "allow", reasons: [], degraded: false });
  });

  test("blocks premium-rate numbers, numbers that can't get a text and Tor", async () => {
    const { deps, live } = await setup();
    const premium = await checkVerificationRisk(deps, live, {
      destination: sms("+19005551234", "premium_rate", "US"),
    });
    expect(premium).toMatchObject({ decision: "block", reasons: [{ code: "phone.premium_rate" }] });
    const tollFree = await checkVerificationRisk(deps, live, {
      destination: sms("+18005551234", "toll_free", "US"),
    });
    expect(tollFree.reasons).toEqual([{ code: "phone.not_mobile" }]);
    const tor = await checkVerificationRisk(deps, live, {
      destination: { channel: "email", address: "ada@example.com" },
      ip: TEST_IPS.tor,
    });
    expect(tor.reasons).toEqual([{ code: "ip.tor" }]);
  });

  test("the environment's lists decide first", async () => {
    const { deps, live } = await setup();
    await addRiskListEntry(live, { list: "block", type: "country", value: "NG" });
    await addRiskListEntry(live, { list: "allow", type: "user", value: "trusted" });
    const blocked = await checkVerificationRisk(deps, live, {
      destination: sms("+2348012345678", "mobile", "NG"),
    });
    expect(blocked.reasons).toEqual([{ code: "list.blocked" }]);
    const allowed = await checkVerificationRisk(deps, live, {
      destination: sms("+19005551234", "premium_rate", "US"),
      userId: "trusted",
    });
    expect(allowed.decision).toBe("allow");
  });

  test("a pumping run across one prefix is blocked once it is rarely approved", async () => {
    const { deps, live } = await setup();
    const decisions: string[] = [];
    for (let i = 0; i < 12; i++) {
      const risk = await checkVerificationRisk(deps, live, {
        destination: sms(`+44740012${String(i).padStart(4, "0")}`),
      });
      decisions.push(risk.decision);
    }
    expect(decisions.slice(0, 9)).toEqual(Array(9).fill("allow"));
    const last = await checkVerificationRisk(deps, live, { destination: sms("+447400129999") });
    expect(last.reasons).toEqual([{ code: "verify.prefix_low_conversion", value: 0 }]);
  });

  test("approvals keep a busy prefix open", async () => {
    const { deps, live } = await setup();
    for (let i = 0; i < 12; i++) {
      const destination = sms(`+44740013${String(i).padStart(4, "0")}`);
      const risk = await checkVerificationRisk(deps, live, { destination });
      expect(risk.decision).toBe("allow");
      if (i % 2 === 0) await recordVerificationApproval(deps, live, destination);
    }
  });

  test("velocity per IP and per user", async () => {
    const { deps, live } = await setup();
    let last = null;
    for (let i = 0; i < 21; i++) {
      last = await checkVerificationRisk(deps, live, {
        destination: { channel: "email", address: `user${i}@example.com` },
        ip: TEST_IPS.residential,
      });
    }
    expect(last?.reasons).toEqual([{ code: "velocity.verifications_per_ip_1h", value: 21 }]);
  });

  test("a start taken back doesn't count", async () => {
    const { deps, live } = await setup();
    const input = {
      destination: { channel: "email" as const, address: "same@example.com" },
      ip: TEST_IPS.residential,
    };
    for (let i = 0; i < 40; i++) {
      const risk = await checkVerificationRisk(deps, live, input);
      expect(risk.decision).toBe("allow");
      await uncountVerificationStart(deps, risk);
    }
  });

  test("an allow-listed start counts nothing, so there is nothing to take back", async () => {
    const { deps, live } = await setup();
    await addRiskListEntry(live, { list: "allow", type: "user", value: "trusted" });
    const input = {
      destination: { channel: "email" as const, address: "x@example.com" },
      ip: TEST_IPS.residential,
      userId: "trusted",
    };
    const allowed = await checkVerificationRisk(deps, live, input);
    expect(allowed.counted).toEqual([]);
    await uncountVerificationStart(deps, allowed);
    // The IP's counter wasn't driven below zero: the next start from it counts as the first.
    const next = await checkVerificationRisk(deps, live, { ...input, userId: "someone" });
    expect(next.counted.length).toBeGreaterThan(0);
    const [count] = (await deps.velocity?.increment([next.counted[0]?.key ?? ""], { by: 0 })) ?? [];
    expect(count?.["1h"]).toBe(1);
  });

  test("without velocity it fails open", async () => {
    const { deps, live } = await setup({ velocity: null });
    expect(await checkVerificationRisk(deps, live, { destination: sms("+447400123456") })).toEqual({
      decision: "allow",
      reasons: [],
      degraded: true,
      counted: [],
    });
  });
});

test("phonePrefix drops the last four digits", () => {
  expect(phonePrefix("+14155552671")).toBe("+1415555");
});
