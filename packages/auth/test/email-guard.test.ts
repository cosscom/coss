import { describe, expect, test } from "bun:test";
import {
  cachedMailDomainCheck,
  canonicalEmail,
  checkMailDomain,
  isDisposableDomain,
  type MailDnsResolver,
  signUpEmailRejection,
} from "../src/email-guard.ts";

function dnsError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

/** Answers from `records` ("MX example.com" → […]); a string value is thrown as that error code. */
function fakeDns(records: Record<string, unknown[] | string>): MailDnsResolver & { calls: number } {
  const dns = {
    calls: 0,
    async resolveMx(name: string) {
      return answer("MX", name) as { exchange: string; priority: number }[];
    },
    async resolve4(name: string) {
      return answer("A", name) as string[];
    },
    async resolve6(name: string) {
      return answer("AAAA", name) as string[];
    },
  };
  function answer(type: string, name: string): unknown[] {
    dns.calls++;
    const value = records[`${type} ${name}`] ?? "ENODATA";
    if (typeof value === "string") throw dnsError(value);
    return value;
  }
  return dns;
}

describe("isDisposableDomain", () => {
  test("matches listed domains and their subdomains, case-insensitively", () => {
    expect(isDisposableDomain("mailinator.com")).toBe(true);
    expect(isDisposableDomain("MAILINATOR.com")).toBe(true);
    expect(isDisposableDomain("inbox.mailinator.com")).toBe(true);
    expect(isDisposableDomain("mailinator.com.")).toBe(true);
  });

  test("leaves mainstream providers and look-alikes alone", () => {
    for (const domain of [
      "gmail.com",
      "outlook.com",
      "proton.me",
      "acme.io",
      "com",
      "mailinator-fan.io",
    ]) {
      expect(isDisposableDomain(domain)).toBe(false);
    }
  });
});

describe("canonicalEmail", () => {
  test.each([
    ["Ada.Lovelace+coss@Gmail.com", "adalovelace@gmail.com"],
    ["a.b@googlemail.com", "ab@gmail.com"],
    ["first.last+x@outlook.com", "first.last@outlook.com"],
    ["me+tag@proton.me", "me@proton.me"],
    // Yahoo uses "-" for its aliases and other domains may treat "+" and dots as significant.
    ["me+tag@yahoo.com", "me+tag@yahoo.com"],
    ["Some.One+x@Acme.io", "some.one+x@acme.io"],
  ])("%s → %s", (email, canonical) => {
    expect(canonicalEmail(email)).toBe(canonical);
  });
});

describe("checkMailDomain", () => {
  test("an MX record means deliverable", async () => {
    const dns = fakeDns({ "MX acme.io": [{ exchange: "mx.acme.io", priority: 10 }] });
    expect(await checkMailDomain("acme.io", dns)).toBe("deliverable");
  });

  test("a domain that doesn't exist is undeliverable", async () => {
    expect(await checkMailDomain("nope.example", fakeDns({ "MX nope.example": "ENOTFOUND" }))).toBe(
      "undeliverable",
    );
  });

  test("a null MX (RFC 7505) is undeliverable", async () => {
    const dns = fakeDns({ "MX acme.io": [{ exchange: "", priority: 0 }] });
    expect(await checkMailDomain("acme.io", dns)).toBe("undeliverable");
  });

  test("without MX, an A or AAAA record is the implicit MX", async () => {
    expect(await checkMailDomain("acme.io", fakeDns({ "A acme.io": ["192.0.2.1"] }))).toBe(
      "deliverable",
    );
    expect(await checkMailDomain("acme.io", fakeDns({ "AAAA acme.io": ["2001:db8::1"] }))).toBe(
      "deliverable",
    );
    expect(await checkMailDomain("acme.io", fakeDns({}))).toBe("undeliverable");
  });

  test("failed lookups are unknown, never undeliverable", async () => {
    expect(await checkMailDomain("acme.io", fakeDns({ "MX acme.io": "ETIMEOUT" }))).toBe("unknown");
    expect(await checkMailDomain("acme.io", fakeDns({ "MX acme.io": "ESERVFAIL" }))).toBe(
      "unknown",
    );
    expect(await checkMailDomain("acme.io", fakeDns({ "A acme.io": "ETIMEOUT" }))).toBe("unknown");
  });
});

describe("cachedMailDomainCheck", () => {
  test("caches definitive verdicts until they expire, never unknown ones", async () => {
    let now = 0;
    const dns = fakeDns({
      "MX acme.io": [{ exchange: "mx.acme.io", priority: 10 }],
      "MX flaky.io": "ETIMEOUT",
    });
    const check = cachedMailDomainCheck({ dns, ttlMs: 1000, now: () => now });
    expect(await check("acme.io")).toBe("deliverable");
    expect(await check("acme.io")).toBe("deliverable");
    expect(dns.calls).toBe(1);
    now = 1001;
    await check("acme.io");
    expect(dns.calls).toBe(2);
    await check("flaky.io");
    await check("flaky.io");
    expect(dns.calls).toBe(4);
  });

  test("evicts the oldest entry when full", async () => {
    const dns = fakeDns({ "A a.io": ["192.0.2.1"], "A b.io": ["192.0.2.1"] });
    const check = cachedMailDomainCheck({ dns, maxEntries: 1 });
    await check("a.io");
    await check("b.io");
    const before = dns.calls;
    await check("a.io");
    expect(dns.calls).toBeGreaterThan(before);
  });
});

describe("signUpEmailRejection", () => {
  const deliverable = async () => "deliverable" as const;
  const undeliverable = async () => "undeliverable" as const;

  test("refuses disposable addresses without a DNS lookup", async () => {
    const rejection = await signUpEmailRejection("x@inbox.mailinator.com", {
      checkDomain: () => {
        throw new Error("no lookup expected");
      },
      production: true,
    });
    expect(rejection?.code).toBe("DISPOSABLE_EMAIL");
  });

  test("refuses domains that can't receive mail, allows the rest", async () => {
    const opts = { production: true };
    expect(
      (await signUpEmailRejection("x@acme.io", { ...opts, checkDomain: undeliverable }))?.code,
    ).toBe("EMAIL_DOMAIN_UNDELIVERABLE");
    expect(
      await signUpEmailRejection("x@acme.io", { ...opts, checkDomain: deliverable }),
    ).toBeNull();
    expect(
      await signUpEmailRejection("x@acme.io", { ...opts, checkDomain: async () => "unknown" }),
    ).toBeNull();
  });

  test("special-use TLDs: allowed in development, refused in production", async () => {
    expect(
      await signUpEmailRejection("x@coss.test", { production: false, checkDomain: undeliverable }),
    ).toBeNull();
    expect(
      (await signUpEmailRejection("x@coss.local", { production: true, checkDomain: deliverable }))
        ?.code,
    ).toBe("EMAIL_DOMAIN_UNDELIVERABLE");
  });
});
