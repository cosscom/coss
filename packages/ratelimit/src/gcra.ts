/**
 * Generic cell rate algorithm (GCRA): each bucket stores one number, its theoretical arrival time
 * (TAT). A request of cost `n` moves the TAT `n × interval` forward and is allowed while the new
 * TAT is at most `burst × interval` ahead of now. Equivalent to a token bucket, but one key, one
 * read and one write, and the key expires once the bucket is full again.
 *
 * `GCRA_SCRIPT` (Valkey) and `gcraConsume` (memory) implement the same rules and must stay in step;
 * `test/store.test.ts` runs the same cases against both.
 */

/** One bucket of a consume call. Every key of one call must share a hash tag (one cluster slot). */
export type LimitSpec = {
  key: string;
  /** Milliseconds per token: `periodMs / limit`. */
  intervalMs: number;
  /** Bucket size in tokens. */
  burst: number;
};

export type LimitState = {
  /** Tokens left after this request (or now, when denied). */
  remaining: number;
  /** Milliseconds until the bucket is full again. */
  resetMs: number;
  /** 0 when allowed; ms until this request would fit; `null` when it never fits (cost > burst). */
  retryAfterMs: number | null;
};

/** All-or-nothing: either every bucket is charged or none is. */
export type ConsumeResult = { allowed: boolean; limits: LimitState[] };

export type ConsumeOptions = {
  /** Tokens to take. Negative refunds (never below a full bucket); refunds are always allowed. */
  cost: number;
  /** Cache an allowed decision atomically with its charge; key shares the buckets’ hash tag. */
  idempotency?: { key: string; ttlMs: number };
  /** Report what would happen without writing anything. */
  peek?: boolean;
};

type Step = { state: LimitState; newTat: number; allowed: boolean };

/** One bucket's decision from its stored TAT (`null` when absent or expired). */
export function gcraStep(
  storedTat: number | null,
  spec: LimitSpec,
  cost: number,
  now: number,
): Step {
  const tolerance = spec.intervalMs * spec.burst;
  const tat = Math.max(storedTat ?? now, now);
  let newTat = Math.max(tat + cost * spec.intervalMs, now);
  let retryAfterMs: number | null = 0;
  let allowed = true;
  if (cost > 0 && newTat - tolerance > now) {
    allowed = false;
    retryAfterMs = cost * spec.intervalMs > tolerance ? null : Math.ceil(newTat - tolerance - now);
    newTat = tat;
  }
  const remaining = Math.max(0, Math.floor((tolerance - (newTat - now)) / spec.intervalMs));
  return { state: { remaining, resetMs: Math.ceil(newTat - now), retryAfterMs }, newTat, allowed };
}

/**
 * The Valkey implementation. KEYS: buckets, then optional replay key. ARGV: cost, peek (0/1),
 * bucket count, replay TTL (0 disables), then interval and burst per bucket. Time comes from the server, so API instances with skewed clocks agree. Returns
 * `allowed, (remaining, reset_ms, retry_after_ms)…` with retry_after_ms -1 for "never fits".
 */
export const GCRA_SCRIPT = `
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + tonumber(t[2]) / 1000
local cost = tonumber(ARGV[1])
local peek = ARGV[2] == '1'
local count = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local replay_key = ttl > 0 and KEYS[count + 1] or nil
if replay_key and not peek then
  local saved = redis.call('GET', replay_key)
  if saved then return cjson.decode(saved) end
end
local allowed = 1
local out = {}
local writes = {}
for i = 1, count do
  local key = KEYS[i]
  local interval = tonumber(ARGV[3 + i * 2])
  local burst = tonumber(ARGV[4 + i * 2])
  local tolerance = interval * burst
  local tat = tonumber(redis.call('GET', key)) or now
  if tat < now then tat = now end
  local new_tat = tat + cost * interval
  if new_tat < now then new_tat = now end
  local retry_after = 0
  if cost > 0 and new_tat - tolerance > now then
    allowed = 0
    if cost * interval > tolerance then
      retry_after = -1
    else
      retry_after = math.ceil(new_tat - tolerance - now)
    end
    new_tat = tat
  else
    writes[#writes + 1] = { key, new_tat }
  end
  local remaining = math.floor((tolerance - (new_tat - now)) / interval)
  if remaining < 0 then remaining = 0 end
  out[#out + 1] = remaining
  out[#out + 1] = math.ceil(new_tat - now)
  out[#out + 1] = retry_after
end
if allowed == 1 and not peek then
  for _, w in ipairs(writes) do
    local ttl = math.ceil(w[2] - now)
    if ttl > 0 then
      redis.call('SET', w[1], string.format('%.3f', w[2]), 'PX', ttl)
    else
      redis.call('DEL', w[1])
    end
  end
end
table.insert(out, 1, allowed)
if replay_key and allowed == 1 and not peek then
  redis.call('SET', replay_key, cjson.encode(out), 'PX', ttl)
end
return out
`;

/** Parses the script's reply. */
export function parseScriptReply(reply: unknown, count: number): ConsumeResult {
  if (!Array.isArray(reply) || reply.length !== 1 + count * 3) {
    throw new Error(`Unexpected rate limit script reply: ${JSON.stringify(reply)}`);
  }
  const values = reply.map(Number);
  const limits: LimitState[] = [];
  for (let i = 0; i < count; i++) {
    const retry = values[1 + i * 3 + 2] ?? 0;
    limits.push({
      remaining: values[1 + i * 3] ?? 0,
      resetMs: values[1 + i * 3 + 1] ?? 0,
      retryAfterMs: retry < 0 ? null : retry,
    });
  }
  return { allowed: values[0] === 1, limits };
}
