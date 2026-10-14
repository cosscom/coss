import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { buildTestMmdb } from "@coss/signals/testing";
import { inArray } from "drizzle-orm";
import {
  createIpIntelligenceSource,
  DATASET_NAMES,
  FEED_URLS,
  refreshDueDatasets,
} from "../src/datasets.ts";

// `risk_dataset` is platform-wide: these tests own it while they run (no other suite writes it).
async function clear() {
  await db.delete(schema.riskDataset).where(inArray(schema.riskDataset.name, [...DATASET_NAMES]));
}

const torList = Array.from(
  { length: 300 },
  (_, i) => `185.220.${Math.floor(i / 250)}.${(i % 250) + 1}`,
).join("\n");
const awsRanges = {
  prefixes: Array.from({ length: 1200 }, (_, i) => ({
    ip_prefix: `3.${Math.floor(i / 256)}.${i % 256}.0/24`,
  })),
  ipv6_prefixes: [],
};
const mmdb = buildTestMmdb([
  { cidr: "8.8.8.0/24", asn: 15169, name: "Google LLC", country: "US" },
  { cidr: "1.1.1.0/24", asn: 13335, name: "Cloudflare, Inc.", country: "US" },
  { cidr: "5.9.0.0/16", asn: 24940, name: "Hetzner Online GmbH", country: "DE" },
  // Enough networks for the minimum tree size a real file is checked against.
  ...Array.from({ length: 400 }, (_, i) => ({
    cidr: `${100 + (i % 50)}.${Math.floor(i / 50)}.0.0/24`,
    asn: 64000 + i,
  })),
]);

function fakeFetch(
  overrides: Record<string, () => Response> = {},
): typeof fetch & { calls: string[] } {
  const calls: string[] = [];
  const feeds: Record<string, () => Response> = {
    [FEED_URLS.tor]: () => new Response(torList),
    [FEED_URLS.aws]: () => Response.json(awsRanges),
    [FEED_URLS.gcp]: () => Response.json({ prefixes: [{ ipv4Prefix: "34.1.208.0/20" }] }),
    [FEED_URLS.oracle]: () => Response.json({ regions: [] }),
    [FEED_URLS.digitalocean]: () => new Response("5.101.96.0/21,NL,NL-NH,Amsterdam,1098 XH\n"),
    [FEED_URLS.ipinfoLite]: () => new Response(mmdb),
    ...overrides,
  };
  const fn = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input).split("?")[0] as string;
    calls.push(url);
    const feed = feeds[url];
    return feed ? feed() : new Response("not found", { status: 404 });
  }) as typeof fetch & { calls: string[] };
  fn.calls = calls;
  return fn;
}

describe("refreshDueDatasets and createIpIntelligenceSource", () => {
  test("stores valid feeds, skips fresh ones, refuses broken or shrunken ones", async () => {
    await clear();
    const now = new Date();
    const first = await refreshDueDatasets({ fetch: fakeFetch(), ipinfoToken: "t", now });
    expect(first.map((r) => [r.name, r.status])).toEqual([
      ["tor", "updated"],
      ["cloud", "updated"],
      ["ipinfo_lite", "updated"],
    ]);

    const source = createIpIntelligenceSource();
    const intelligence = await source.current();
    expect(intelligence.available).toEqual({ tor: true, cloud: true, asn: true });
    expect(intelligence.lookup("185.220.0.1")?.tor).toBe(true);
    expect(intelligence.lookup("3.1.2.3")).toMatchObject({ cloud_provider: "aws", hosting: true });
    expect(intelligence.lookup("5.9.1.1")).toMatchObject({
      asn: 24940,
      hosting_provider: "hetzner",
    });

    // Nothing is due ten minutes later; the same content an hour later is "unchanged".
    const soon = await refreshDueDatasets({
      fetch: fakeFetch(),
      ipinfoToken: "t",
      now: new Date(now.getTime() + 10 * 60_000),
    });
    expect(soon.map((r) => r.status)).toEqual(["not_due", "not_due", "not_due"]);
    const later = new Date(now.getTime() + 31 * 60_000);
    expect((await refreshDueDatasets({ fetch: fakeFetch(), now: later }))[0]?.status).toBe(
      "unchanged",
    );

    const broken = await refreshDueDatasets({
      fetch: fakeFetch({
        [FEED_URLS.tor]: () => new Response(torList.split("\n").slice(0, 120).join("\n")),
        [FEED_URLS.gcp]: () => new Response("rate limited", { status: 429 }),
        [FEED_URLS.ipinfoLite]: () => new Response(buildTestMmdb([{ cidr: "8.8.8.0/24", asn: 1 }])),
      }),
      ipinfoToken: "t",
      force: true,
    });
    expect(broken.map((r) => r.status)).toEqual(["failed", "failed", "failed"]);
    expect(broken[0]?.error).toContain("refusing to replace");
    expect(broken[1]?.error).toContain("429");
    expect(broken[2]?.error).toContain("AS15169");
    // The stored copies are untouched.
    expect((await createIpIntelligenceSource().current()).lookup("185.220.0.140")?.tor).toBe(true);
  });

  test("without a token IPinfo is skipped; a fresh source with nothing stored is empty", async () => {
    await clear();
    const empty = await createIpIntelligenceSource().current();
    expect(empty.available).toEqual({ tor: false, cloud: false, asn: false });
    const results = await refreshDueDatasets({ fetch: fakeFetch() });
    expect(results.find((r) => r.name === "ipinfo_lite")?.status).toBe("skipped");
    await clear();
  });
});
