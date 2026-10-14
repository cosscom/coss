import { describe, expect, test } from "bun:test";
import {
  createIpIntelligence,
  formatCidr,
  IpRangeSet,
  isBlockedAddress,
  normalizeIp,
  parseCidr,
  subnetOf,
} from "../src/ip.ts";

describe("normalizeIp", () => {
  test.each([
    ["192.0.2.1", "192.0.2.1"],
    [" 192.0.2.1 ", "192.0.2.1"],
    ["2001:DB8:0:0:0:0:0:1", "2001:db8::1"],
    ["2001:db8:0:1:0:0:0:0", "2001:db8:0:1::"],
    ["::ffff:198.51.100.7", "198.51.100.7"],
    ["::1", "::1"],
    ["1:0:0:2:0:0:0:3", "1:0:0:2::3"],
    ["1:2:3:4:5:6:7:8", "1:2:3:4:5:6:7:8"],
  ])("%s → %s", (input, output) => {
    expect(normalizeIp(input)).toBe(output);
  });

  test("rejects non-addresses", () => {
    for (const input of ["", "300.1.1.1", "example.com", "1.2.3", "192.0.2.1/24"]) {
      expect(normalizeIp(input)).toBeNull();
    }
  });
});

describe("parseCidr", () => {
  test("clears host bits and accepts bare addresses", () => {
    expect(formatCidr(parseCidr("192.0.2.77/24") ?? fail())).toBe("192.0.2.0/24");
    expect(formatCidr(parseCidr("2001:db8::1/32") ?? fail())).toBe("2001:db8::/32");
    expect(formatCidr(parseCidr("192.0.2.7") ?? fail())).toBe("192.0.2.7/32");
    expect(formatCidr(parseCidr("::ffff:192.0.2.0/120") ?? fail())).toBe("192.0.2.0/24");
    expect(formatCidr(parseCidr("0.0.0.0/0") ?? fail())).toBe("0.0.0.0/0");
  });

  test("rejects bad prefixes", () => {
    for (const input of ["192.0.2.0/33", "192.0.2.0/-1", "192.0.2.0/x", "2001:db8::/129", "a/1"]) {
      expect(parseCidr(input)).toBeNull();
    }
  });
});

describe("subnetOf", () => {
  test("IPv4 /24 and IPv6 /64", () => {
    expect(subnetOf("198.51.100.42")).toBe("198.51.100.0/24");
    expect(subnetOf("2001:db8:1:2:3:4:5:6")).toBe("2001:db8:1:2::/64");
    expect(subnetOf("::ffff:198.51.100.42")).toBe("198.51.100.0/24");
    expect(subnetOf("nope")).toBeNull();
  });
});

describe("isBlockedAddress", () => {
  test("special-use addresses are blocked, public ones aren't", () => {
    for (const address of ["10.1.2.3", "127.0.0.1", "::1", "fe80::1", "::ffff:10.0.0.1", "x"]) {
      expect(isBlockedAddress(address)).toBe(true);
    }
    for (const address of ["8.8.8.8", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isBlockedAddress(address)).toBe(false);
    }
  });
});

describe("IpRangeSet", () => {
  const set = IpRangeSet.from([
    ["10.0.0.0/8", "outer"],
    ["10.1.0.0/16", "inner"],
    ["10.200.0.0/16", "late"],
    ["2001:db8::/32", "v6"],
    ["not a cidr", "skipped"],
  ]);

  test("returns the most specific containing range", () => {
    expect(set.size).toBe(4);
    expect(set.lookup("10.1.2.3")).toBe("inner");
    expect(set.lookup("10.2.0.1")).toBe("outer");
    // After a later-starting sibling ends, the enclosing range still matches.
    expect(set.lookup("10.201.0.1")).toBe("outer");
    expect(set.lookup("10.200.9.9")).toBe("late");
    expect(set.lookup("11.0.0.1")).toBeNull();
    expect(set.lookup("9.255.255.255")).toBeNull();
    expect(set.lookup("2001:db8:ffff::1")).toBe("v6");
    expect(set.lookup("2001:db9::1")).toBeNull();
    expect(set.lookup("::ffff:10.1.0.1")).toBe("inner");
  });
});

describe("createIpIntelligence", () => {
  const intel = createIpIntelligence({
    tor: IpRangeSet.from([
      ["198.51.100.7", true as const],
      ["185.220.101.1", true as const],
    ]),
    cloud: IpRangeSet.from([
      ["203.0.113.0/24", "aws"],
      ["3.4.0.0/16", "aws"],
    ]),
    asn: (address) =>
      address.startsWith("8.8.")
        ? { asn: 15169, name: "Google LLC", domain: "google.com", country: "US" }
        : address.startsWith("5.9.")
          ? { asn: 24940, name: "Hetzner Online GmbH", domain: "hetzner.com", country: "DE" }
          : null,
  });

  test("bogons get no other signal (documentation ranges included)", () => {
    expect(intel.lookup("198.51.100.7")).toMatchObject({ bogon: true, tor: false });
    expect(intel.lookup("10.0.0.1")).toMatchObject({ bogon: true, asn: null });
  });

  test("Tor exits and published cloud ranges", () => {
    expect(intel.lookup("185.220.101.1")).toMatchObject({ tor: true, hosting: false });
    expect(intel.lookup("3.4.5.6")).toMatchObject({
      tor: false,
      cloud_provider: "aws",
      hosting: true,
      hosting_provider: "aws",
      hosting_kind: "cloud",
    });
  });

  test("hosting from ASNs; Google's AS15169 isn't hosting", () => {
    expect(intel.lookup("5.9.1.1")).toMatchObject({
      hosting: true,
      hosting_provider: "hetzner",
      hosting_kind: "hosting",
      asn: 24940,
      country: "DE",
    });
    expect(intel.lookup("8.8.8.8")).toMatchObject({ hosting: false, asn: 15169, country: "US" });
  });

  test("invalid input is null; missing datasets are reported", () => {
    expect(intel.lookup("nope")).toBeNull();
    expect(intel.available).toEqual({ tor: true, cloud: true, asn: true });
    expect(createIpIntelligence({}).available).toEqual({ tor: false, cloud: false, asn: false });
  });
});

function fail(): never {
  throw new Error("expected a value");
}
