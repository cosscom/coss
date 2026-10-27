/**
 * Email domain age for `email.domain_new`: registration dates from RDAP, cached platform-wide in
 * `risk_domain_age` (dates for 30 days, misses for a day). An assessment waits for a lookup at
 * most `timeoutMs`; a slower one keeps running and fills the cache for the next assessment.
 */
import { db, type Executor, schema } from "@coss/db";
import type { DomainRegistration } from "@coss/signals/rdap";
import { eq } from "drizzle-orm";
import { noTurns, type Turns } from "./turns.ts";

const { riskDomainAge } = schema;

const DAY_MS = 24 * 60 * 60_000;
const FOUND_TTL_MS = 30 * DAY_MS;
const MISS_TTL_MS = DAY_MS;

export type DomainAgeLookup = (domain: string) => Promise<DomainRegistration>;

export type DomainAge = {
  /** Whole days since registration; `null` when unknown. */
  days: number | null;
  /** The lookup failed or is still running (the assessment went without it). */
  degraded: boolean;
};

const inFlight = new Map<string, Promise<DomainRegistration | null>>();

/** Looks a domain up and caches the answer; never throws (`null` on failure). */
function lookUp(
  lookup: DomainAgeLookup,
  domain: string,
  now: Date,
): Promise<DomainRegistration | null> {
  const running = inFlight.get(domain);
  if (running) return running;
  const promise = (async () => {
    try {
      const registration = await lookup(domain);
      const row = {
        registeredAt: registration.registeredAt,
        status: registration.status,
        checkedAt: now,
      };
      await db
        .insert(riskDomainAge)
        .values({ domain, ...row })
        .onConflictDoUpdate({ target: riskDomainAge.domain, set: row });
      return registration;
    } catch {
      return null;
    } finally {
      inFlight.delete(domain);
    }
  })();
  inFlight.set(domain, promise);
  return promise;
}

function ageDays(registeredAt: Date | null, now: Date): number | null {
  if (!registeredAt) return null;
  return Math.max(0, Math.floor((now.getTime() - registeredAt.getTime()) / DAY_MS));
}

export async function domainAge(
  executor: Executor,
  lookup: DomainAgeLookup,
  domain: string,
  opts: { timeoutMs: number; now?: Date; turns?: Turns },
): Promise<DomainAge> {
  const now = opts.now ?? new Date();
  const [cached] = await (opts.turns ?? noTurns)(() =>
    executor.select().from(riskDomainAge).where(eq(riskDomainAge.domain, domain)).limit(1),
  );
  if (cached) {
    const ttl = cached.status === "found" ? FOUND_TTL_MS : MISS_TTL_MS;
    if (now.getTime() - cached.checkedAt.getTime() < ttl) {
      return { days: ageDays(cached.registeredAt, now), degraded: false };
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    lookUp(lookup, domain, now),
    new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), opts.timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
  if (result === "timeout" || result === null) {
    // A stale cached date is better than none.
    return { days: cached ? ageDays(cached.registeredAt, now) : null, degraded: !cached };
  }
  return { days: ageDays(result.registeredAt, now), degraded: false };
}
