/**
 * Velocity: how many events of one kind an environment saw per IP, subnet, email domain, mailbox
 * or user in the last hour and day. One Valkey hash per counter, keyed by the identifier's HMAC,
 * with a field per 5-minute bucket; `VELOCITY_SCRIPT` adds this event and sums both windows
 * atomically on the server's clock. Each call touches one key, so it works on a cluster.
 */
import { createHash } from "node:crypto";
import type { Cluster, Redis } from "iovalkey";
import type { VelocityWindow } from "./schemas.ts";

export const VELOCITY_BUCKET_MS = 5 * 60_000;
const BUCKETS_PER_HOUR = 12;
const BUCKETS_PER_DAY = 288;
const KEY_TTL_MS = 25 * 60 * 60_000;

export type VelocityCounts = Record<VelocityWindow, number>;

/** Where counters live. Implementations throw on failure; assessments then go without velocity. */
export interface VelocityStore {
  /** Counts this event under every key and returns each key's totals (this event included). */
  increment(keys: readonly string[]): Promise<VelocityCounts[]>;
}

/**
 * KEYS[1]: the counter. ARGV: bucket size (ms), buckets per hour, buckets per day, TTL (ms).
 * Returns { last hour, last day }.
 */
export const VELOCITY_SCRIPT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local size = tonumber(ARGV[1])
local hour = tonumber(ARGV[2])
local day = tonumber(ARGV[3])
local bucket = math.floor(now / size)
redis.call('HINCRBY', KEYS[1], bucket, 1)
local fields = redis.call('HGETALL', KEYS[1])
local last_hour = 0
local last_day = 0
for i = 1, #fields, 2 do
  local b = tonumber(fields[i])
  local count = tonumber(fields[i + 1])
  if b <= bucket - day then
    redis.call('HDEL', KEYS[1], fields[i])
  else
    last_day = last_day + count
    if b > bucket - hour then last_hour = last_hour + count end
  end
end
redis.call('PEXPIRE', KEYS[1], ARGV[4])
return { last_hour, last_day }
`;

const SCRIPT_SHA = createHash("sha1").update(VELOCITY_SCRIPT).digest("hex");
const SCRIPT_ARGS = [
  String(VELOCITY_BUCKET_MS),
  String(BUCKETS_PER_HOUR),
  String(BUCKETS_PER_DAY),
  String(KEY_TTL_MS),
];

/** Counters in Valkey (standalone or cluster); shares the rate limiter's connection. */
export class ValkeyVelocityStore implements VelocityStore {
  readonly #client: Redis | Cluster;

  constructor(client: Redis | Cluster) {
    this.#client = client;
  }

  async increment(keys: readonly string[]): Promise<VelocityCounts[]> {
    return Promise.all(keys.map((key) => this.#incrementOne(key)));
  }

  async #incrementOne(key: string): Promise<VelocityCounts> {
    let reply: unknown;
    try {
      reply = await this.#client.evalsha(SCRIPT_SHA, 1, key, ...SCRIPT_ARGS);
    } catch (error) {
      // First call on a node (or after a restart/failover): the script is not cached yet.
      if (!(error instanceof Error) || !error.message.startsWith("NOSCRIPT")) throw error;
      reply = await this.#client.eval(VELOCITY_SCRIPT, 1, key, ...SCRIPT_ARGS);
    }
    if (!Array.isArray(reply) || reply.length !== 2) {
      throw new Error("Unexpected reply from the velocity script.");
    }
    return { "1h": Number(reply[0]), "24h": Number(reply[1]) };
  }
}

/**
 * In-process counters: for development without Valkey and for tests. Every process counts on its
 * own. `now` is injectable for tests.
 */
export class MemoryVelocityStore implements VelocityStore {
  readonly #counters = new Map<string, Map<number, number>>();
  readonly #now: () => number;

  constructor(opts: { now?: () => number } = {}) {
    this.#now = opts.now ?? Date.now;
  }

  async increment(keys: readonly string[]): Promise<VelocityCounts[]> {
    const bucket = Math.floor(this.#now() / VELOCITY_BUCKET_MS);
    if (this.#counters.size > 50_000) this.#counters.clear();
    return keys.map((key) => {
      const buckets = this.#counters.get(key) ?? new Map<number, number>();
      this.#counters.set(key, buckets);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      let hour = 0;
      let day = 0;
      for (const [b, count] of buckets) {
        if (b <= bucket - BUCKETS_PER_DAY) {
          buckets.delete(b);
          continue;
        }
        day += count;
        if (b > bucket - BUCKETS_PER_HOUR) hour += count;
      }
      return { "1h": hour, "24h": day };
    });
  }
}

/** The Valkey key of a counter: `<prefix>:risk:v:<event>:<dimension>:{<identifier hash>}`. */
export function velocityKey(
  prefix: string,
  eventKey: string,
  dimension: string,
  valueHash: string,
): string {
  return `${prefix}:risk:v:${eventKey}:${dimension}:{${valueHash}}`;
}
