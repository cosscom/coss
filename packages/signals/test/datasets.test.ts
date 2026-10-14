import { describe, expect, test } from "bun:test";
import {
  decodeCloudDataset,
  decodeTorDataset,
  encodeCloudDataset,
  encodeTorDataset,
  ipinfoLiteLookup,
  parseAwsRanges,
  parseDigitalOceanRanges,
  parseGcpRanges,
  parseOracleRanges,
  parseTorExitList,
} from "../src/datasets.ts";
import { buildTestMmdb } from "../src/testing.ts";

describe("feed parsers", () => {
  test("Tor bulk exit list", () => {
    expect(
      parseTorExitList("185.220.101.1\n# comment\n\nnot-an-ip\n185.220.101.1\n2a0b::1\n"),
    ).toEqual(["185.220.101.1", "2a0b::1"]);
  });

  test("AWS, GCP, Oracle and DigitalOcean", () => {
    expect(
      parseAwsRanges({
        prefixes: [{ ip_prefix: "3.4.12.4/32" }, { ip_prefix: 7 }],
        ipv6_prefixes: [{ ipv6_prefix: "2406:DABA:F000::/40" }],
      }),
    ).toEqual([
      { cidr: "3.4.12.4/32", provider: "aws" },
      { cidr: "2406:daba:f000::/40", provider: "aws" },
    ]);
    expect(
      parseGcpRanges({
        prefixes: [{ ipv4Prefix: "34.1.208.0/20" }, { ipv6Prefix: "2600:1900::/44" }],
      }),
    ).toEqual([
      { cidr: "34.1.208.0/20", provider: "gcp" },
      { cidr: "2600:1900::/44", provider: "gcp" },
    ]);
    expect(
      parseOracleRanges({ regions: [{ cidrs: [{ cidr: "40.233.0.0/19" }, { cidr: "x" }] }] }),
    ).toEqual([{ cidr: "40.233.0.0/19", provider: "oracle" }]);
    expect(parseDigitalOceanRanges("5.101.96.0/21,NL,NL-NH,Amsterdam,1098 XH\n\nbad,NL\n")).toEqual(
      [{ cidr: "5.101.96.0/21", provider: "digitalocean" }],
    );
    expect(parseAwsRanges(null as unknown)).toEqual([]);
  });
});

describe("stored formats", () => {
  test("cloud and Tor datasets round-trip into range sets", () => {
    const cloud = decodeCloudDataset(
      encodeCloudDataset([
        { cidr: "3.4.0.0/16", provider: "aws" },
        { cidr: "3.4.0.0/16", provider: "aws" },
        { cidr: "34.1.208.0/20", provider: "gcp" },
      ]),
    );
    expect(cloud.size).toBe(2);
    expect(cloud.lookup("34.1.209.1")).toBe("gcp");
    const tor = decodeTorDataset(encodeTorDataset(["185.220.101.1", "185.220.101.1"]));
    expect(tor.size).toBe(1);
    expect(tor.has("185.220.101.1")).toBe(true);
  });
});

describe("ipinfoLiteLookup", () => {
  const mmdb = buildTestMmdb([
    { cidr: "8.8.8.0/24", asn: 15169, name: "Google LLC", domain: "google.com", country: "US" },
    { cidr: "5.9.0.0/16", asn: 24940, name: "Hetzner Online GmbH", country: "de" },
    { cidr: "2a01:4f8::/32", asn: 24940, name: "Hetzner Online GmbH", country: "DE" },
  ]);
  const lookup = ipinfoLiteLookup(mmdb);

  test("reads ASN, name, domain and country", () => {
    expect(lookup("8.8.8.8")).toEqual({
      asn: 15169,
      name: "Google LLC",
      domain: "google.com",
      country: "US",
    });
    expect(lookup("5.9.200.1")).toEqual({
      asn: 24940,
      name: "Hetzner Online GmbH",
      domain: null,
      country: "DE",
    });
    expect(lookup("2a01:4f8:1::1")?.asn).toBe(24940);
    expect(lookup("1.1.1.1")).toBeNull();
    expect(lookup("not an ip")).toBeNull();
  });

  test("a file that isn't an MMDB throws", () => {
    expect(() => ipinfoLiteLookup(new TextEncoder().encode("<html>rate limited</html>"))).toThrow();
  });
});
