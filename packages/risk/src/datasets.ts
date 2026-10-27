/**
 * The public IP feeds behind risk's IP signals. The worker downloads them (`refreshDueDatasets`),
 * validates them and stores the latest good copy of each in `risk_dataset`; API processes load
 * them into memory (`createIpIntelligenceSource`) and pick up new versions every few minutes.
 * A failed or suspicious download never replaces a good copy.
 */
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { db, schema } from "@coss/db";
import {
  decodeCloudDataset,
  decodeTorDataset,
  encodeCloudDataset,
  encodeTorDataset,
  ipinfoLiteLookup,
  mmdbNodeCount,
  parseAwsRanges,
  parseDigitalOceanRanges,
  parseGcpRanges,
  parseOracleRanges,
  parseTorExitList,
} from "@coss/signals/datasets";
import {
  type AsnLookup,
  createIpIntelligence,
  type IpIntelligence,
  type IpRangeSet,
} from "@coss/signals/ip";
import { eq } from "drizzle-orm";

const { riskDataset } = schema;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const DATASET_NAMES = ["tor", "cloud", "ipinfo_lite"] as const;
export type DatasetName = (typeof DATASET_NAMES)[number];

/** How often each feed is fetched. */
export const DATASET_REFRESH_MS: Record<DatasetName, number> = {
  tor: 30 * MINUTE,
  cloud: 24 * HOUR,
  ipinfo_lite: 24 * HOUR,
};

export const FEED_URLS = {
  tor: "https://check.torproject.org/torbulkexitlist",
  aws: "https://ip-ranges.amazonaws.com/ip-ranges.json",
  gcp: "https://www.gstatic.com/ipranges/cloud.json",
  oracle: "https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json",
  digitalocean: "https://www.digitalocean.com/geo/google.csv",
  ipinfoLite: "https://ipinfo.io/data/ipinfo_lite.mmdb",
} as const;

/** A new copy smaller than this share of the stored one is refused (a truncated feed). */
const MIN_SHRINK_RATIO = 0.5;
/** Feeds this small are broken, whatever the stored copy says. */
const MIN_ENTRIES: Record<DatasetName, number> = { tor: 100, cloud: 1000, ipinfo_lite: 1000 };
const FETCH_TIMEOUT_MS = 60_000;
/** Attempts per feed URL: a connection the feed's host drops mid-download is retried. */
const DOWNLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_000;

/** Well-known networks a real IPinfo Lite file must know. */
const ASN_CANARIES: [address: string, asn: number][] = [
  ["8.8.8.8", 15169],
  ["1.1.1.1", 13335],
];

/** Throws when `lookup` doesn't know the canary networks (a wrong or corrupt file). */
export function validateAsnLookup(lookup: AsnLookup): void {
  for (const [address, asn] of ASN_CANARIES) {
    const found = lookup(address)?.asn;
    if (found !== asn) throw new Error(`Expected AS${asn} for ${address}, got ${found ?? "none"}`);
  }
}

type Built = { content: Uint8Array; entries: number };

type Download = (url: string, kind: "text" | "json" | "bytes") => Promise<unknown>;

/** An answer from the feed's host (a status or an unreadable body), not worth asking again. */
class FeedError extends Error {}

function downloader(fetcher: typeof fetch, retryDelayMs: number): Download {
  const once = async (url: string, kind: "text" | "json" | "bytes") => {
    const response = await fetcher(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      throw new FeedError(`GET ${new URL(url).host}${new URL(url).pathname} → ${response.status}`);
    }
    if (kind === "text") return response.text();
    if (kind === "bytes") return new Uint8Array(await response.arrayBuffer());
    const text = await response.text();
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      throw new FeedError(error instanceof Error ? error.message : String(error));
    }
  };
  return async (url, kind) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await once(url, kind);
      } catch (error) {
        // Network failures (a reset or closed connection) are retried; a timeout already took a
        // minute, and the next run comes in ten.
        const timeout = error instanceof Error && error.name === "TimeoutError";
        if (error instanceof FeedError || timeout || attempt >= DOWNLOAD_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  };
}

const encoder = new TextEncoder();

async function buildTor(download: Download): Promise<Built> {
  const addresses = parseTorExitList((await download(FEED_URLS.tor, "text")) as string);
  return { content: encoder.encode(encodeTorDataset(addresses)), entries: addresses.length };
}

async function buildCloud(download: Download): Promise<Built> {
  // Every provider or none: a dataset missing one provider would silently drop its ranges.
  const [aws, gcp, oracle, digitalocean] = await Promise.all([
    download(FEED_URLS.aws, "json"),
    download(FEED_URLS.gcp, "json"),
    download(FEED_URLS.oracle, "json"),
    download(FEED_URLS.digitalocean, "text"),
  ]);
  const ranges = [
    ...parseAwsRanges(aws),
    ...parseGcpRanges(gcp),
    ...parseOracleRanges(oracle),
    ...parseDigitalOceanRanges(digitalocean as string),
  ];
  const text = encodeCloudDataset(ranges);
  return { content: encoder.encode(text), entries: text ? text.split("\n").length : 0 };
}

async function buildIpinfoLite(download: Download, token: string): Promise<Built> {
  const url = `${FEED_URLS.ipinfoLite}?token=${encodeURIComponent(token)}`;
  const bytes = (await download(url, "bytes")) as Uint8Array;
  validateAsnLookup(ipinfoLiteLookup(bytes));
  // The file has no record count; its tree size tracks the number of networks.
  return { content: bytes, entries: mmdbNodeCount(bytes) };
}

export type DatasetRefreshResult = {
  name: DatasetName;
  status: "updated" | "unchanged" | "not_due" | "skipped" | "failed";
  error?: string;
};

/**
 * Downloads every feed that is due (or all of them with `force`) and stores the ones that changed.
 * Never throws: failures are reported per dataset and the stored copy is kept. `ipinfo_lite` is
 * skipped without a token.
 */
export async function refreshDueDatasets(
  opts: {
    fetch?: typeof fetch;
    ipinfoToken?: string;
    now?: Date;
    force?: boolean;
    retryDelayMs?: number;
  } = {},
): Promise<DatasetRefreshResult[]> {
  const download = downloader(opts.fetch ?? fetch, opts.retryDelayMs ?? RETRY_DELAY_MS);
  const now = opts.now ?? new Date();
  const stored = new Map(
    (
      await db
        .select({
          name: riskDataset.name,
          sha256: riskDataset.sha256,
          entries: riskDataset.entries,
          checkedAt: riskDataset.checkedAt,
        })
        .from(riskDataset)
    ).map((row) => [row.name, row]),
  );
  const builders: Record<DatasetName, (() => Promise<Built>) | null> = {
    tor: () => buildTor(download),
    cloud: () => buildCloud(download),
    ipinfo_lite: opts.ipinfoToken
      ? () => buildIpinfoLite(download, opts.ipinfoToken as string)
      : null,
  };
  const results: DatasetRefreshResult[] = [];
  for (const name of DATASET_NAMES) {
    const build = builders[name];
    if (!build) {
      results.push({ name, status: "skipped" });
      continue;
    }
    const previous = stored.get(name);
    if (
      !opts.force &&
      previous &&
      now.getTime() - previous.checkedAt.getTime() < DATASET_REFRESH_MS[name]
    ) {
      results.push({ name, status: "not_due" });
      continue;
    }
    try {
      const built = await build();
      if (built.entries < MIN_ENTRIES[name]) {
        throw new Error(`Only ${built.entries} entries: refusing to store it.`);
      }
      if (previous && built.entries < previous.entries * MIN_SHRINK_RATIO) {
        throw new Error(
          `${built.entries} entries, down from ${previous.entries}: refusing to replace it.`,
        );
      }
      const sha256 = createHash("sha256").update(built.content).digest("hex");
      if (previous?.sha256 === sha256) {
        await db.update(riskDataset).set({ checkedAt: now }).where(eq(riskDataset.name, name));
        results.push({ name, status: "unchanged" });
        continue;
      }
      const row = {
        sha256,
        entries: built.entries,
        content: gzipSync(built.content),
        updatedAt: now,
        checkedAt: now,
      };
      await db
        .insert(riskDataset)
        .values({ name, ...row })
        .onConflictDoUpdate({ target: riskDataset.name, set: row });
      results.push({ name, status: "updated" });
    } catch (error) {
      results.push({
        name,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

/** Stores a dataset as is (tests and local development seed fixtures this way). */
export async function storeDataset(
  name: DatasetName,
  content: Uint8Array | string,
  entries: number,
): Promise<void> {
  const bytes = typeof content === "string" ? encoder.encode(content) : content;
  const row = {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    entries,
    content: gzipSync(bytes),
    updatedAt: new Date(),
    checkedAt: new Date(),
  };
  await db
    .insert(riskDataset)
    .values({ name, ...row })
    .onConflictDoUpdate({ target: riskDataset.name, set: row });
}

/** Provides the current `IpIntelligence` (reloaded in the background when a dataset changes). */
export type IpIntelligenceSource = { current(): Promise<IpIntelligence> };

type Loaded = {
  sha256: Partial<Record<DatasetName, string>>;
  tor: IpRangeSet<true> | null;
  cloud: IpRangeSet<string> | null;
  asn: AsnLookup | null;
};

const EMPTY: Loaded = { sha256: {}, tor: null, cloud: null, asn: null };

/**
 * Loads the stored datasets into memory: the first call waits for the load, later calls get the
 * loaded copy at once while a reload (every `refreshMs`, default 5 minutes) runs in the
 * background. A failed load keeps what was loaded before (or nothing: IP data is then degraded).
 */
export function createIpIntelligenceSource(
  opts: { refreshMs?: number; now?: () => number; onError?: (error: unknown) => void } = {},
): IpIntelligenceSource {
  const refreshMs = opts.refreshMs ?? 5 * MINUTE;
  const now = opts.now ?? Date.now;
  const onError =
    opts.onError ??
    ((error: unknown) => console.error("[risk] Loading IP datasets failed:", error));
  let loaded: Loaded = EMPTY;
  let intelligence = createIpIntelligence({});
  let loadedAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<void> | null = null;

  async function reload(): Promise<void> {
    try {
      const versions = await db
        .select({ name: riskDataset.name, sha256: riskDataset.sha256 })
        .from(riskDataset);
      const next: Loaded = { ...loaded, sha256: { ...loaded.sha256 } };
      let changed = false;
      for (const { name, sha256 } of versions) {
        if (!isDatasetName(name) || loaded.sha256[name] === sha256) continue;
        const [row] = await db
          .select({ content: riskDataset.content, sha256: riskDataset.sha256 })
          .from(riskDataset)
          .where(eq(riskDataset.name, name));
        if (!row) continue;
        const content = gunzipSync(row.content);
        if (name === "tor") next.tor = decodeTorDataset(content.toString("utf8"));
        if (name === "cloud") next.cloud = decodeCloudDataset(content.toString("utf8"));
        if (name === "ipinfo_lite") next.asn = ipinfoLiteLookup(content);
        next.sha256[name] = row.sha256;
        changed = true;
      }
      if (changed) {
        loaded = next;
        intelligence = createIpIntelligence(loaded);
      }
    } catch (error) {
      onError(error);
    } finally {
      loadedAt = now();
      inFlight = null;
    }
  }

  return {
    async current() {
      if (now() - loadedAt >= refreshMs && !inFlight) inFlight = reload();
      // Only the very first load is waited for.
      if (loadedAt === Number.NEGATIVE_INFINITY && inFlight) await inFlight;
      return intelligence;
    },
  };
}

function isDatasetName(name: string): name is DatasetName {
  return (DATASET_NAMES as readonly string[]).includes(name);
}
