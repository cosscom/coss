import { createHash } from "node:crypto";
import type { EventEmitter } from "node:events";
import { Cluster, Redis } from "iovalkey";
import {
  type ConsumeOptions,
  type ConsumeResult,
  GCRA_SCRIPT,
  gcraStep,
  type LimitSpec,
  parseScriptReply,
} from "./gcra.ts";

/** Where bucket state lives. Implementations throw on failure; each bucket defines the fallback. */
export interface RateLimitStore {
  consume(specs: readonly LimitSpec[], options: ConsumeOptions): Promise<ConsumeResult>;
  close(): Promise<void>;
}

/**
 * In-process buckets: for development without Valkey and for tests. Every process counts on its
 * own, so never use it with more than one instance. `now` is injectable for tests.
 */
export class MemoryStore implements RateLimitStore {
  readonly #tats = new Map<string, number>();
  readonly #now: () => number;

  constructor(opts: { now?: () => number } = {}) {
    this.#now = opts.now ?? Date.now;
  }

  async consume(specs: readonly LimitSpec[], options: ConsumeOptions): Promise<ConsumeResult> {
    const now = this.#now();
    const steps = specs.map((spec) => {
      const stored = this.#tats.get(spec.key);
      return gcraStep(
        stored !== undefined && stored > now ? stored : null,
        spec,
        options.cost,
        now,
      );
    });
    const allowed = steps.every((step) => step.allowed);
    if (allowed && !options.peek) {
      for (const [index, step] of steps.entries()) {
        const key = specs[index]?.key;
        if (key === undefined) continue;
        if (step.newTat > now) this.#tats.set(key, step.newTat);
        else this.#tats.delete(key);
      }
    }
    // Expired entries would otherwise pile up in a long-running dev server.
    if (this.#tats.size > 10_000) {
      for (const [key, tat] of this.#tats) if (tat <= now) this.#tats.delete(key);
    }
    return { allowed, limits: steps.map((step) => step.state) };
  }

  async close(): Promise<void> {
    this.#tats.clear();
  }
}

const SCRIPT_SHA = createHash("sha1").update(GCRA_SCRIPT).digest("hex");

export type ValkeyConnectionOptions = {
  /** `redis://…` or `rediss://user:password@host:port` (TLS). */
  url: string;
  /** ElastiCache Serverless only speaks the cluster protocol. */
  cluster?: boolean;
  /** Per-command timeout: a slow cache must not slow every API request. */
  commandTimeoutMs?: number;
  /** Logs connection errors (at most one line per 10 s). */
  onError?: (error: Error) => void;
};

type ValkeyClient = Redis | Cluster;

/** Buckets in Valkey (standalone or cluster), evaluated atomically by `GCRA_SCRIPT`. */
export class ValkeyStore implements RateLimitStore {
  readonly client: ValkeyClient;

  constructor(client: ValkeyClient) {
    this.client = client;
  }

  /**
   * Resolves once connected. Commands fail instead of queueing while disconnected (and the limiter
   * applies the bucket's policy), so call this at startup before accepting requests.
   */
  ready(timeoutMs = 5000): Promise<void> {
    if (this.client.status === "ready") return Promise.resolve();
    // Redis and Cluster have incompatible overloads for `on`/`off`; both are EventEmitters.
    const emitter: EventEmitter = this.client;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        emitter.off("ready", onReady);
        reject(new Error(`Valkey was not ready within ${timeoutMs} ms.`));
      }, timeoutMs);
      const onReady = () => {
        clearTimeout(timer);
        resolve();
      };
      emitter.once("ready", onReady);
    });
  }

  static connect(opts: ValkeyConnectionOptions): ValkeyStore {
    return new ValkeyStore(createValkeyClient(opts));
  }

  async consume(specs: readonly LimitSpec[], options: ConsumeOptions): Promise<ConsumeResult> {
    if (specs.length === 0) return { allowed: true, limits: [] };
    const keys = specs.map((spec) => spec.key);
    const args = [
      String(options.cost),
      options.peek ? "1" : "0",
      ...specs.flatMap((spec) => [String(spec.intervalMs), String(spec.burst)]),
    ];
    let reply: unknown;
    try {
      reply = await this.client.evalsha(SCRIPT_SHA, keys.length, ...keys, ...args);
    } catch (error) {
      // First call on a node (or after a restart/failover): the script is not cached yet.
      if (!(error instanceof Error) || !error.message.startsWith("NOSCRIPT")) throw error;
      reply = await this.client.eval(GCRA_SCRIPT, keys.length, ...keys, ...args);
    }
    return parseScriptReply(reply, specs.length);
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}

function throttled(log: (error: Error) => void, intervalMs: number): (error: Error) => void {
  let last = 0;
  return (error) => {
    const now = Date.now();
    if (now - last < intervalMs) return;
    last = now;
    log(error);
  };
}

export function createValkeyClient(opts: ValkeyConnectionOptions): ValkeyClient {
  const url = new URL(opts.url);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("VALKEY_URL must start with redis:// or rediss://.");
  }
  const tls = url.protocol === "rediss:" ? {} : undefined;
  const username = url.username ? decodeURIComponent(url.username) : undefined;
  const password = url.password ? decodeURIComponent(url.password) : undefined;
  const common = {
    username,
    password,
    tls,
    commandTimeout: opts.commandTimeoutMs ?? 100,
    connectTimeout: 2000,
    // Fail fast instead of queueing while disconnected; the limiter applies each bucket's policy.
    maxRetriesPerRequest: 0,
  };
  const onError = throttled(
    opts.onError ??
      ((error) => console.warn(`[ratelimit] Valkey connection error: ${error.message}`)),
    10_000,
  );

  if (opts.cluster) {
    const cluster = new Cluster([{ host: url.hostname, port: Number(url.port || 6379) }], {
      // ElastiCache's TLS certificates name the hostnames, not the IPs they resolve to.
      dnsLookup: (address, callback) => callback(null, address),
      enableOfflineQueue: false,
      slotsRefreshTimeout: 2000,
      redisOptions: common,
    });
    cluster.on("error", onError);
    return cluster;
  }
  const client = new Redis({
    host: url.hostname,
    port: Number(url.port || 6379),
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    enableOfflineQueue: false,
    ...common,
  });
  client.on("error", onError);
  return client;
}
