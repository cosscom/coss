/**
 * Shows or changes an organization's rate limit overrides (takes up to a minute to apply):
 *   bun run ratelimit:set --org acme                                   # list buckets and rules
 *   bun run ratelimit:set --org acme --bucket email.recipients.day --limit 50000 [--period 1d] [--burst N]
 *   bun run ratelimit:set --org acme --bucket email.recipients.day --reset
 */
import { parseArgs } from "node:util";
import { closeDb, db } from "@coss/db";
import { organization } from "@coss/db/schema";
import { eq } from "drizzle-orm";
import { BUCKET_NAMES, BUCKETS, isOverridableBucket, type LimitRule } from "../src/buckets.ts";
import {
  deleteRateLimitOverride,
  listRateLimitOverrides,
  setRateLimitOverride,
} from "../src/overrides.ts";

const USAGE =
  "Usage: bun run ratelimit:set --org <slug> [--bucket <name> (--limit <n> [--period <1s|5m|1h|1d>] " +
  "[--burst <n>] | --reset)]";

const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

function parsePeriod(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid --period "${value}" (e.g. 1s, 5m, 1h, 1d).`);
  return Number(match[1]) * (UNITS[match[2] ?? "ms"] ?? 1);
}

function formatPeriod(ms: number): string {
  for (const unit of ["d", "h", "m", "s"] as const) {
    const size = UNITS[unit] ?? 1;
    if (ms % size === 0) return `${ms / size}${unit}`;
  }
  return `${ms}ms`;
}

function describe(rule: LimitRule): string {
  return `${rule.limit} per ${formatPeriod(rule.periodMs)}, burst ${rule.burst ?? rule.limit}`;
}

function positiveInt(name: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      org: { type: "string" },
      bucket: { type: "string" },
      limit: { type: "string" },
      period: { type: "string" },
      burst: { type: "string" },
      reset: { type: "boolean", default: false },
    },
  });
  if (!values.org) throw new Error(USAGE);

  const [org] = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.slug, values.org));
  if (!org) throw new Error(`No organization with the slug "${values.org}".`);

  if (values.bucket) {
    const bucket = values.bucket;
    if (!isOverridableBucket(bucket)) {
      const names = BUCKET_NAMES.filter((name) => BUCKETS[name].overridable).join(", ");
      throw new Error(`"${bucket}" can't be overridden. Overridable buckets: ${names}.`);
    }
    if (values.reset) {
      const existed = await deleteRateLimitOverride({ organizationId: org.id, bucket });
      console.info(existed ? `Removed the ${bucket} override.` : `${bucket} had no override.`);
    } else {
      const limit = positiveInt("limit", values.limit);
      if (limit === undefined) throw new Error(USAGE);
      const burst = positiveInt("burst", values.burst);
      const rule: LimitRule = {
        limit,
        periodMs: values.period ? parsePeriod(values.period) : BUCKETS[bucket].periodMs,
        ...(burst === undefined ? {} : { burst }),
      };
      if (bucket === "email.recipients.second" && (rule.burst ?? rule.limit) < 50) {
        console.warn(
          "Warning: a burst below 50 rejects emails with that many recipients outright.",
        );
      }
      await setRateLimitOverride({ organizationId: org.id, bucket, rule });
      console.info(`Set ${bucket}: ${describe(rule)}.`);
    }
  }

  const overrides = await listRateLimitOverrides(org.id);
  console.info(`\nRate limits of ${org.name} (${org.id}):`);
  for (const name of BUCKET_NAMES) {
    const definition = BUCKETS[name];
    if (!definition.overridable) continue;
    const override = overrides[name];
    const rule = override ?? definition;
    console.info(`  ${name.padEnd(30)} ${describe(rule)}${override ? "  (override)" : ""}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
