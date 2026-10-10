/**
 * Environment variables of the rate limiter, for each app's t3-env schema. Imports only zod: app
 * env modules (and `next.config.ts`) load it before anything touches the database or Valkey.
 */
import { z } from "zod";

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

export const rateLimitEnvShape = {
  // Valkey holding the counters: `redis://host:6379` locally, `rediss://user:password@host:6379`
  // for ElastiCache Serverless (printed by `bun run valkey:bootstrap`). Required in production;
  // unset elsewhere, every process counts on its own in memory.
  VALKEY_URL: z.url().optional(),
  // `true` for ElastiCache Serverless, which only speaks the cluster protocol.
  VALKEY_CLUSTER: booleanString.default(false),
  // Namespaces every key, so several stages can share one cache.
  RATE_LIMIT_KEY_PREFIX: z
    .string()
    .regex(/^[a-z0-9_-]{1,32}$/)
    .default("coss"),
  // The header the load balancer puts the caller's address in (e.g. `x-forwarded-for`). Unset,
  // per-IP limits are off: the socket address would be the load balancer's.
  CLIENT_IP_HEADER: z.string().toLowerCase().optional(),
  // With `x-forwarded-for`: how many proxies we run append to it (the client address is that
  // many entries from the right; anything further left is client-controlled).
  TRUSTED_PROXY_COUNT: z.coerce.number().int().min(1).max(10).default(1),
};

export type RateLimitEnv = {
  VALKEY_URL?: string | undefined;
  VALKEY_CLUSTER: boolean;
  RATE_LIMIT_KEY_PREFIX: string;
  CLIENT_IP_HEADER?: string | undefined;
  TRUSTED_PROXY_COUNT: number;
};
