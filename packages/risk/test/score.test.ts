import { describe, expect, test } from "bun:test";
import { REASONS } from "../src/schemas.ts";
import {
  decide,
  reasonMessage,
  type StoredReason,
  scoreReasons,
  sortReasons,
} from "../src/score.ts";

const r = (code: StoredReason["code"], extra: Partial<StoredReason> = {}): StoredReason => ({
  code,
  ...extra,
});

/** The default policy's decisions for common combinations: change weights deliberately. */
describe("golden cases", () => {
  test.each<[string, StoredReason[], "allow" | "review" | "block"]>([
    ["nothing", [], "allow"],
    ["a typo alone", [r("email.typo")], "allow"],
    ["a hosting provider alone", [r("ip.hosting_provider")], "allow"],
    ["a role account on a VPN", [r("email.role_account"), r("ip.vpn_network")], "allow"],
    ["Tor alone", [r("ip.tor")], "review"],
    ["a disposable address", [r("email.disposable")], "review"],
    ["a duplicate mailbox", [r("duplicate.canonical_mailbox")], "review"],
    [
      "disposable from a hosting provider",
      [r("email.disposable"), r("ip.hosting_provider")],
      "review",
    ],
    ["disposable over Tor", [r("email.disposable"), r("ip.tor")], "block"],
    [
      "disposable, hosting, and a sign-up burst",
      [r("email.disposable"), r("ip.hosting_provider"), r("velocity.signups_per_ip_1h")],
      "block",
    ],
    ["a reported user", [r("history.fraud_user")], "review"],
    [
      "a reported user from a reported IP",
      [r("history.fraud_user"), r("history.fraud_ip")],
      "block",
    ],
    ["a private IP alone", [r("ip.private")], "allow"],
  ])("%s → %s", (_, reasons, decision) => {
    expect(decide(scoreReasons(reasons), reasons)).toBe(decision);
  });
});

describe("lists", () => {
  test("allow beats block beats the score", () => {
    const blocked = [r("list.blocked")];
    expect(decide(scoreReasons(blocked), blocked)).toBe("block");
    const both = [r("list.blocked"), r("list.allowed"), r("email.disposable"), r("ip.tor")];
    expect(decide(scoreReasons(both), both)).toBe("allow");
  });
});

describe("scoreReasons", () => {
  test("noisy-OR of the weights, never above 1", () => {
    expect(scoreReasons([r("email.disposable")])).toBe(REASONS["email.disposable"].weight);
    expect(scoreReasons([r("email.disposable"), r("ip.tor")])).toBe(0.85);
    const all = Object.keys(REASONS).map((code) => r(code as StoredReason["code"]));
    expect(scoreReasons(all)).toBeLessThanOrEqual(1);
  });
});

describe("sortReasons and messages", () => {
  test("lists first, then by weight", () => {
    expect(
      sortReasons([r("email.typo"), r("list.blocked"), r("email.disposable")]).map((x) => x.code),
    ).toEqual(["list.blocked", "email.disposable", "email.typo"]);
  });

  test("every reason has a message without identifiers", () => {
    for (const code of Object.keys(REASONS)) {
      expect(reasonMessage(r(code as StoredReason["code"], { value: 7, window: "1h" }))).toMatch(
        /\.$/,
      );
    }
    expect(
      reasonMessage(r("velocity.signups_per_ip_1h", { value: 7, threshold: 5, window: "1h" })),
    ).toBe("7 sign-ups from this IP address in the last hour.");
  });
});
