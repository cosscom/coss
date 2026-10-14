/**
 * `POST /v1/risk/assessments`: collects the signals of one event (email, IP, velocity, lists,
 * what the environment remembers), turns them into reasons, a score and a decision, and stores the
 * assessment with its log line, mailbox identity and (for `review`) webhook in one transaction.
 *
 * Every signal is best-effort: a slow DNS lookup, missing IP data or an unreachable Valkey make
 * the assessment go without it (listed in `degraded`) rather than fail.
 */
import { db, type Executor, schema, type Transaction } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { IDEMPOTENCY_KEY_TTL_MS, isReplayOf, requestHash } from "@coss/db/idempotency";
import { appendLogEntries } from "@coss/logs";
import { analyzeEmail, type EmailAnalysis, type MailDomainVerdict } from "@coss/signals/email";
import { type IpSignals, isBlockedAddress, normalizeIp, subnetOf } from "@coss/signals/ip";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, eq, gte, isNotNull, ne, or, type SQL, sql } from "drizzle-orm";
import type { IpIntelligenceSource } from "./datasets.ts";
import { RiskError } from "./errors.ts";
import type { RiskHasher, RiskHashKind } from "./hash.ts";
import { type ListMatch, matchListEntries } from "./lists.ts";
import { type RiskAssessmentRow, type StoredSignals, toRiskAssessmentObject } from "./read.ts";
import {
  SANDBOX_DISPOSABLE_DOMAIN,
  sandboxIpSignals,
  sandboxMailDomainVerdict,
} from "./sandbox.ts";
import {
  type CreateRiskAssessmentRequestOutput,
  type RiskAssessmentOutput,
  type RiskDegradedSignal,
  type StoredRiskWebhookEvent,
  VELOCITY_RULES,
  type VelocityDimension,
  velocityDimensionsFor,
  velocityGroup,
} from "./schemas.ts";
import {
  decide,
  type StoredReason,
  scoreReasons,
  sortReasons,
  type Thresholds,
  toReasonObject,
} from "./score.ts";
import { type VelocityStore, velocityKey } from "./velocity.ts";

const { riskAssessment, riskIdentity, riskReport } = schema;

/** IP and subnet fraud reports only count this long; mailboxes and users until forgotten. */
export const NETWORK_REPORT_TTL_MS = 30 * 24 * 60 * 60_000;
const DEFAULT_DNS_TIMEOUT_MS = 800;

export type RiskDeps = {
  hash: RiskHasher;
  ipIntelligence: IpIntelligenceSource;
  /** `null`: no velocity (every assessment reports it as degraded). */
  velocity: VelocityStore | null;
  /** Namespaces velocity keys in Valkey (`RATE_LIMIT_KEY_PREFIX`). */
  keyPrefix: string;
  checkMailDomain: (domain: string) => Promise<MailDomainVerdict>;
  dnsTimeoutMs?: number;
  thresholds?: Thresholds;
};

/** The authenticated environment (from the API key). */
export type RiskAssessEnvironment = {
  organizationId: string;
  projectId: string;
  environmentId: string;
  mode: "live" | "sandbox";
};

export type AssessRiskInput = {
  environment: RiskAssessEnvironment;
  params: CreateRiskAssessmentRequestOutput;
  idempotencyKey?: string | null;
  apiKeyId?: string | null;
  requestId?: string | null;
};

type Hashes = Partial<Record<RiskHashKind, string>>;

/** Collected signals, before adding mailbox duplicates and the decision. */
type Collected = {
  signals: StoredSignals;
  reasons: StoredReason[];
  degraded: RiskDegradedSignal[];
  email: EmailAnalysis | null;
  ip: string | null;
  hashes: Hashes;
};

const IDEMPOTENCY_ERRORS = {
  inProgress: () =>
    new RiskError("request_in_progress", "This idempotency key is busy. Retry shortly."),
  reused: () =>
    new RiskError(
      "idempotency_key_reused",
      "This idempotency key was already used with a different request body.",
    ),
};

export async function assessRisk(
  deps: RiskDeps,
  input: AssessRiskInput,
): Promise<{ assessment: RiskAssessmentOutput; replayed: boolean }> {
  const { environment, params } = input;
  const idempotencyKey = input.idempotencyKey || null;
  const hash = idempotencyKey ? requestHash(params) : null;

  // The dataset source can need its own database connection on first load. Resolve it before
  // occupying a transaction connection, so concurrent requests cannot exhaust the pool.
  const ipSignals = await ipSignalsFor(
    deps,
    params.ip ? normalizeIp(params.ip) : null,
    environment.mode === "sandbox",
  );
  return db.transaction(async (tx) => {
    if (idempotencyKey) {
      // Hold the key across collection and commit, including expired-key replacement.
      const lock = `risk:idempotency:${environment.environmentId}:${idempotencyKey}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lock}, 0))`);
      const [existing] = await tx
        .select()
        .from(riskAssessment)
        .where(
          and(
            eq(riskAssessment.environmentId, environment.environmentId),
            eq(riskAssessment.organizationId, environment.organizationId),
            eq(riskAssessment.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (existing && isReplayOf(existing, hash)) {
        return { assessment: toRiskAssessmentObject(existing), replayed: true };
      }
      if (existing) {
        if (Date.now() - existing.createdAt.getTime() <= IDEMPOTENCY_KEY_TTL_MS) {
          throw IDEMPOTENCY_ERRORS.reused();
        }
        await tx
          .update(riskAssessment)
          .set({ idempotencyKey: null })
          .where(eq(riskAssessment.id, existing.id));
      }
    }
    // Use this connection for reads too: waiting retries may occupy the rest of the pool.
    const collected = await collectSignals(tx, deps, environment, params, ipSignals);
    const row = await insertAssessment(tx, deps, input, collected, {
      idempotencyKey,
      requestHash: hash,
    });
    if (!row) throw IDEMPOTENCY_ERRORS.inProgress();
    return { assessment: toRiskAssessmentObject(row), replayed: false };
  });
}

/** Resolves to `fallback` when `promise` takes longer than `ms` (the promise keeps running). */
function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function collectSignals(
  executor: Executor,
  deps: RiskDeps,
  environment: RiskAssessEnvironment,
  params: CreateRiskAssessmentRequestOutput,
  resolvedIpSignals: Awaited<ReturnType<typeof ipSignalsFor>>,
): Promise<Collected> {
  const sandbox = environment.mode === "sandbox";
  const env = environment.environmentId;
  const reasons: StoredReason[] = [];
  const degraded = new Set<RiskDegradedSignal>();

  const email = params.user?.email !== undefined ? analyzeEmail(params.user.email) : null;
  const ip = params.ip ? normalizeIp(params.ip) : null;
  const userId = params.user?.id ?? null;

  const hashes: Hashes = {};
  if (email?.valid) hashes.mailbox = deps.hash(env, "mailbox", email.canonical);
  if (ip) {
    hashes.ip = deps.hash(env, "ip", ip);
    const subnet = subnetOf(ip);
    if (subnet) hashes.subnet = deps.hash(env, "subnet", subnet);
  }
  if (userId) hashes.user = deps.hash(env, "user", userId);

  const [deliverability, ipSignals, velocity, listMatches, reports] = await Promise.all([
    emailDeliverability(deps, email, sandbox),
    resolvedIpSignals,
    countVelocity(deps, environment, params, email, ip, hashes),
    matchListEntries(executor, environment, {
      mailbox: email?.valid ? email.canonical : null,
      domain: email?.valid ? email.domain : null,
      ip,
      asn: null,
      country: null,
      userId,
    }),
    reportedHashes(executor, environment, hashes),
  ]);

  // Email.
  let emailSignals: StoredSignals["email"] = null;
  if (email) {
    const disposable =
      email.disposable || (sandbox && email.valid && email.domain === SANDBOX_DISPOSABLE_DOMAIN);
    if (deliverability === "unknown" && email.valid) degraded.add("email_dns");
    emailSignals = {
      valid: email.valid,
      disposable,
      deliverability,
      role_account: email.role,
      free_provider: email.free,
      suggestion: email.suggestion,
    };
    if (!email.valid) reasons.push({ code: "email.invalid" });
    if (disposable) reasons.push({ code: "email.disposable" });
    if (deliverability === "undeliverable") reasons.push({ code: "email.undeliverable" });
    if (email.role) reasons.push({ code: "email.role_account" });
    if (email.suggestion) reasons.push({ code: "email.typo", suggestion: email.suggestion });
  }

  // IP.
  let ipObject: StoredSignals["ip"] = null;
  if (ip) {
    if (ipSignals.degraded) degraded.add("ip_data");
    const found = ipSignals.signals;
    if (found) {
      ipObject = {
        version: found.version,
        private: found.bogon,
        tor: found.tor,
        hosting: found.hosting,
        hosting_provider: found.hosting_provider,
        hosting_kind: found.hosting_kind,
        asn: found.asn,
        as_name: found.as_name,
        country: found.country,
      };
      if (found.bogon) reasons.push({ code: "ip.private" });
      if (found.tor) reasons.push({ code: "ip.tor" });
      if (found.hosting_kind === "vpn") {
        reasons.push({ code: "ip.vpn_network", provider: found.hosting_provider ?? "unknown" });
      } else if (found.hosting) {
        reasons.push({
          code: "ip.hosting_provider",
          provider: found.hosting_provider ?? "unknown",
        });
      }
    }
  }

  // Lists can also match on the IP's network and country, known only now.
  const networkMatches =
    ipObject && (ipObject.asn || ipObject.country)
      ? await matchListEntries(executor, environment, {
          asn: ipObject.asn,
          country: ipObject.country,
        })
      : [];
  for (const match of dedupeMatches([...listMatches, ...networkMatches])) {
    reasons.push({
      code: match.list === "allow" ? "list.allowed" : "list.blocked",
      entry: match.id,
      type: match.type,
    });
  }

  // Velocity.
  if (velocity === null) degraded.add("velocity");
  else {
    const group = velocityGroup(params.event);
    for (const rule of VELOCITY_RULES) {
      if (rule.events !== group) continue;
      const value = velocity[`${rule.dimension}_${rule.window}`];
      if (value !== undefined && value >= rule.threshold) {
        reasons.push({
          code: rule.code as StoredReason["code"],
          value,
          threshold: rule.threshold,
          window: rule.window,
        });
      }
    }
  }

  // Memory.
  if (reports.has("mailbox")) reasons.push({ code: "history.fraud_mailbox" });
  if (reports.has("user")) reasons.push({ code: "history.fraud_user" });
  if (reports.has("ip")) reasons.push({ code: "history.fraud_ip" });
  else if (reports.has("subnet")) reasons.push({ code: "history.fraud_subnet" });

  return {
    signals: { email: emailSignals, ip: ipObject, velocity },
    reasons,
    degraded: [...degraded].sort(),
    email,
    ip,
    hashes,
  };
}

function dedupeMatches(matches: ListMatch[]): ListMatch[] {
  return [...new Map(matches.map((match) => [match.id, match])).values()];
}

async function emailDeliverability(
  deps: RiskDeps,
  email: EmailAnalysis | null,
  sandbox: boolean,
): Promise<MailDomainVerdict> {
  if (!email?.valid) return "unknown";
  const fixture = sandbox ? sandboxMailDomainVerdict(email.domain) : null;
  if (fixture) return fixture;
  try {
    return await within(
      deps.checkMailDomain(email.domain),
      deps.dnsTimeoutMs ?? DEFAULT_DNS_TIMEOUT_MS,
      "unknown",
    );
  } catch {
    return "unknown";
  }
}

async function ipSignalsFor(
  deps: RiskDeps,
  ip: string | null,
  sandbox: boolean,
): Promise<{ signals: IpSignals | null; degraded: boolean }> {
  if (!ip) return { signals: null, degraded: false };
  const fixture = sandbox ? sandboxIpSignals(ip) : null;
  if (fixture) return { signals: fixture, degraded: false };
  try {
    const intelligence = await deps.ipIntelligence.current();
    const { tor, cloud, asn } = intelligence.available;
    return { signals: intelligence.lookup(ip), degraded: !(tor && cloud && asn) };
  } catch {
    return { signals: null, degraded: true };
  }
}

/** Counts this event; `null` when velocity is unavailable. Keys are `<dimension>_<window>`. */
async function countVelocity(
  deps: RiskDeps,
  environment: RiskAssessEnvironment,
  params: CreateRiskAssessmentRequestOutput,
  email: EmailAnalysis | null,
  ip: string | null,
  hashes: Hashes,
): Promise<Record<string, number> | null> {
  if (!deps.velocity) return null;
  const env = environment.environmentId;
  // Private addresses are the integration's proxy, shared by every event: never count them
  // (a sandbox's documentation addresses stand for public ones).
  const sandbox = environment.mode === "sandbox";
  const publicIp =
    ip !== null && ((sandbox && sandboxIpSignals(ip) !== null) || !isBlockedAddress(ip));
  const values: Partial<Record<VelocityDimension, string>> = {
    ip: publicIp ? hashes.ip : undefined,
    subnet: publicIp ? hashes.subnet : undefined,
    mailbox: hashes.mailbox,
    user: hashes.user,
    email_domain:
      email?.valid && !email.free ? deps.hash(env, "email_domain", email.domain) : undefined,
  };
  const eventKey = params.event === "custom" ? `custom.${params.event_name}` : params.event;
  const dimensions = velocityDimensionsFor(params.event).filter((d) => values[d]);
  if (dimensions.length === 0) return {};
  try {
    const counts = await deps.velocity.increment(
      dimensions.map((d) => velocityKey(deps.keyPrefix, eventKey, d, values[d] as string)),
    );
    const result: Record<string, number> = {};
    dimensions.forEach((dimension, index) => {
      const count = counts[index];
      if (!count) return;
      result[`${dimension}_1h`] = count["1h"];
      result[`${dimension}_24h`] = count["24h"];
    });
    return result;
  } catch (error) {
    console.warn("[risk] Velocity is unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Which of the hashes were reported as fraud or abuse (networks only for 30 days). */
async function reportedHashes(
  executor: Executor,
  environment: RiskAssessEnvironment,
  hashes: Hashes,
): Promise<Set<string>> {
  const pairs: SQL[] = [];
  const networkCutoff = new Date(Date.now() - NETWORK_REPORT_TTL_MS);
  for (const kind of ["mailbox", "user", "ip", "subnet"] as const) {
    const value = hashes[kind];
    if (!value) continue;
    const network = kind === "ip" || kind === "subnet";
    pairs.push(
      and(
        eq(riskReport.kind, kind),
        eq(riskReport.valueHash, value),
        network ? gte(riskReport.reportedAt, networkCutoff) : undefined,
      ) as SQL,
    );
  }
  if (pairs.length === 0) return new Set();
  const rows = await executor
    .select({ kind: riskReport.kind })
    .from(riskReport)
    .where(
      and(
        eq(riskReport.organizationId, environment.organizationId),
        eq(riskReport.environmentId, environment.environmentId),
        or(...pairs),
      ),
    );
  return new Set(rows.map((row) => row.kind));
}

async function insertAssessment(
  tx: Transaction,
  deps: RiskDeps,
  input: AssessRiskInput,
  collected: Collected,
  key: { idempotencyKey: string | null; requestHash: string | null },
): Promise<RiskAssessmentRow | undefined> {
  const { environment, params } = input;
  const userId = params.user?.id ?? null;
  const mailboxHash = collected.hashes.mailbox;
  const reasons = [...collected.reasons];

  // "This mailbox already has an account": serialized per mailbox, so of two concurrent sign-ups
  // with one mailbox the second sees the first.
  let previous: { userId: string | null; assessmentId: string } | undefined;
  if (params.event === "signup" && mailboxHash) {
    const lock = `risk:mailbox:${environment.environmentId}:${mailboxHash}`;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lock}, 0))`);
    [previous] = await tx
      .select({ userId: riskIdentity.userId, assessmentId: riskIdentity.assessmentId })
      .from(riskIdentity)
      .where(
        and(
          eq(riskIdentity.organizationId, environment.organizationId),
          eq(riskIdentity.environmentId, environment.environmentId),
          eq(riskIdentity.kind, "mailbox"),
          eq(riskIdentity.valueHash, mailboxHash),
          // Only accounts count: earlier attempts without a user are velocity, not duplicates.
          isNotNull(riskIdentity.userId),
          userId ? ne(riskIdentity.userId, userId) : undefined,
        ),
      )
      .orderBy(riskIdentity.firstSeenAt)
      .limit(1);
    if (previous) {
      reasons.push({
        code: "duplicate.canonical_mailbox",
        previous_user: previous.userId,
        previous_assessment: previous.assessmentId,
      });
    }
  }

  const sorted = sortReasons(reasons);
  const score = scoreReasons(sorted);
  const decision = decide(score, sorted, deps.thresholds);
  const now = new Date();

  const [row] = await tx
    .insert(riskAssessment)
    .values({
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.environmentId,
      event: params.event,
      eventName: params.event_name ?? null,
      userId,
      email: collected.email?.address ?? null,
      ip: collected.ip,
      userAgent: params.user_agent ?? null,
      emailHash: collected.hashes.mailbox ?? null,
      ipHash: collected.hashes.ip ?? null,
      subnetHash: collected.hashes.subnet ?? null,
      decision,
      score,
      reasons: sorted,
      signals: collected.signals,
      degraded: collected.degraded,
      reviewStatus: decision === "review" ? "open" : null,
      idempotencyKey: key.idempotencyKey,
      requestHash: key.requestHash,
      createdAt: now,
    })
    .onConflictDoNothing({ target: [riskAssessment.environmentId, riskAssessment.idempotencyKey] })
    .returning();
  if (!row) return undefined;

  if (params.event === "signup" && mailboxHash && decision !== "block") {
    await tx
      .insert(riskIdentity)
      .values({
        organizationId: environment.organizationId,
        environmentId: environment.environmentId,
        kind: "mailbox",
        valueHash: mailboxHash,
        userId,
        assessmentId: row.id,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [
          riskIdentity.environmentId,
          riskIdentity.kind,
          riskIdentity.valueHash,
          riskIdentity.userId,
        ],
        // `assessment_id` stays the first assessment that saw this user with the mailbox.
        set: { lastSeenAt: now },
      });
  }

  const label = params.event === "custom" ? (params.event_name ?? "custom") : params.event;
  await appendLogEntries(tx, [
    {
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.environmentId,
      occurredAt: now,
      source: "risk",
      level: decision === "allow" ? "info" : "warning",
      type: "risk.assessment",
      message: `${label} assessed: ${decision} (score ${Math.round(score * 100) / 100})`,
      requestId: input.requestId ?? null,
      apiKeyId: input.apiKeyId ?? null,
      resourceType: "risk_assessment",
      resourceId: row.id,
      attributes: {
        event: params.event,
        decision,
        score,
        reasons: sorted.map((reason) => reason.code),
      },
      searchTerms: [decision, ...sorted.map((reason) => reason.code)],
    },
  ]);

  if (decision === "review") {
    const id = newId(ID_PREFIXES.webhookEvent);
    const payload: StoredRiskWebhookEvent = {
      id,
      object: "event",
      type: "risk.assessment.review",
      created_at: now.toISOString(),
      data: {
        assessment_id: row.id,
        event: params.event,
        event_name: params.event_name ?? null,
        decision,
        score,
        reasons: sorted.map(toReasonObject),
        user_id: userId,
        occurred_at: now.toISOString(),
      },
    };
    await enqueueWebhookMessage(tx, {
      id,
      organizationId: environment.organizationId,
      environmentId: environment.environmentId,
      type: payload.type,
      payload,
      now,
    });
  }
  return row;
}
