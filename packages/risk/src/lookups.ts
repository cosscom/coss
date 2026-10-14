/**
 * The signals behind assessments, also offered alone as building blocks (`POST
 * /v1/risk/email/check`, `/ip/check`, `/content/classify`): stateless lookups that store and count
 * nothing about the person looked up. Each one is best-effort and bounded in time, except
 * classification, which a caller asked for explicitly and is told about when it fails.
 */
import { db, type Executor } from "@coss/db";
import type { ContentClassifier } from "@coss/screening/classifier";
import { MAX_TEXT_CHARS, prepareLinks, prepareText, urlsInText } from "@coss/screening/text";
import { analyzeEmail, type EmailAnalysis, type MailDomainVerdict } from "@coss/signals/email";
import { type IpSignals, normalizeIp } from "@coss/signals/ip";
import type { RiskDeps } from "./assess.ts";
import { domainAge } from "./domain-age.ts";
import { RiskError } from "./errors.ts";
import {
  SANDBOX_DISPOSABLE_DOMAIN,
  sandboxContentScores,
  sandboxDomainAgeDays,
  sandboxIpSignals,
  sandboxMailDomainVerdict,
} from "./sandbox.ts";
import {
  CONTENT_CATEGORIES,
  type ContentCategory,
  type RiskContentClassificationOutput,
  type RiskEmailCheckOutput,
  type RiskIpCheckOutput,
} from "./schemas.ts";

const DEFAULT_DNS_TIMEOUT_MS = 800;
const DEFAULT_DOMAIN_AGE_TIMEOUT_MS = 1000;
/** Classification asks a model: at most this long, then the caller goes without it. */
export const DEFAULT_CLASSIFY_TIMEOUT_MS = 3000;

/** What a lookup needs to know about the caller's environment. */
export type LookupEnvironment = { organizationId: string; mode: "live" | "sandbox" };

/** Resolves to `fallback` when `promise` takes longer than `ms` (the promise keeps running). */
export function within<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Disposable, counting the sandbox's `@disposable.test`. */
export function isDisposable(email: EmailAnalysis, sandbox: boolean): boolean {
  return email.disposable || (sandbox && email.valid && email.domain === SANDBOX_DISPOSABLE_DOMAIN);
}

export async function emailDeliverability(
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

/** Domain age, looked up only for organizations' own domains (not free or disposable ones). */
export async function emailDomainAge(
  executor: Executor,
  deps: RiskDeps,
  email: EmailAnalysis | null,
  sandbox: boolean,
): Promise<{ days: number | null; degraded: boolean }> {
  if (!email?.valid || email.free || isDisposable(email, sandbox)) {
    return { days: null, degraded: false };
  }
  if (sandbox && (email.domain === "test" || email.domain.endsWith(".test"))) {
    return { days: sandboxDomainAgeDays(email.domain), degraded: false };
  }
  if (!deps.domainAge) return { days: null, degraded: true };
  return domainAge(executor, deps.domainAge, email.domain, {
    timeoutMs: deps.domainAgeTimeoutMs ?? DEFAULT_DOMAIN_AGE_TIMEOUT_MS,
  });
}

export async function ipSignalsFor(
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

/** `POST /v1/risk/email/check`. */
export async function checkEmail(
  deps: RiskDeps,
  environment: LookupEnvironment,
  address: string,
): Promise<RiskEmailCheckOutput> {
  const sandbox = environment.mode === "sandbox";
  const email = analyzeEmail(address);
  const [deliverability, age] = await Promise.all([
    emailDeliverability(deps, email, sandbox),
    emailDomainAge(db, deps, email, sandbox),
  ]);
  const degraded: RiskEmailCheckOutput["degraded"] = [];
  if (email.valid && deliverability === "unknown") degraded.push("email_dns");
  if (age.degraded) degraded.push("domain_age");
  return {
    object: "risk_email_check",
    email: address,
    valid: email.valid,
    domain: email.valid ? email.domain : null,
    canonical: email.valid ? email.canonical : null,
    disposable: isDisposable(email, sandbox),
    deliverability,
    role_account: email.role,
    free_provider: email.free,
    suggestion: email.suggestion,
    domain_age_days: age.days,
    degraded,
  };
}

/** `POST /v1/risk/ip/check`. */
export async function checkIp(
  deps: RiskDeps,
  environment: LookupEnvironment,
  address: string,
): Promise<RiskIpCheckOutput> {
  const ip = normalizeIp(address) ?? address;
  const { signals, degraded } = await ipSignalsFor(deps, ip, environment.mode === "sandbox");
  return {
    object: "risk_ip_check",
    ip,
    version: signals?.version ?? (ip.includes(":") ? 6 : 4),
    private: signals?.bogon ?? false,
    tor: signals?.tor ?? false,
    hosting: signals?.hosting ?? false,
    hosting_provider: signals?.hosting_provider ?? null,
    hosting_kind: signals?.hosting_kind ?? null,
    asn: signals?.asn ?? null,
    as_name: signals?.as_name ?? null,
    country: signals?.country ?? null,
    degraded: degraded ? ["ip_data"] : [],
  };
}

export type ContentScores = Record<ContentCategory, number>;

/**
 * Scores text with the classifier (sandbox environments: the `[coss-test:…]` markers). Throws
 * `RiskError("classification_unavailable")` when there is no classifier, or it failed or took
 * longer than the timeout. Neither the text nor the scores are kept.
 */
export async function classifyContent(
  deps: RiskDeps,
  environment: LookupEnvironment,
  text: string,
): Promise<RiskContentClassificationOutput> {
  const truncated = text.length > MAX_TEXT_CHARS;
  if (environment.mode === "sandbox") {
    return { object: "risk_content_classification", scores: sandboxContentScores(text), truncated };
  }
  const scores = await modelScores(deps.classifier, text, deps.classifyTimeoutMs);
  return { object: "risk_content_classification", scores, truncated };
}

async function modelScores(
  classifier: ContentClassifier | null,
  text: string,
  timeoutMs = DEFAULT_CLASSIFY_TIMEOUT_MS,
): Promise<ContentScores> {
  if (!classifier) {
    throw new RiskError(
      "classification_unavailable",
      "Content classification isn't available at the moment. Retry later.",
    );
  }
  try {
    const verdict = await classifier.classify(
      { kind: "text", text: prepareText(text), links: prepareLinks(urlsInText(text)) },
      AbortSignal.timeout(timeoutMs),
    );
    return Object.fromEntries(
      CONTENT_CATEGORIES.map((category) => [
        category,
        Math.round(Math.min(1, Math.max(0, verdict.scores[category] ?? 0)) * 1000) / 1000,
      ]),
    ) as ContentScores;
  } catch (error) {
    // Never the text: only that the model failed.
    console.warn(
      "[risk] Content classification failed:",
      error instanceof Error ? error.name : "error",
    );
    throw new RiskError(
      "classification_unavailable",
      "Content classification failed or timed out. Retry later.",
    );
  }
}

/**
 * Content scores for an assessment: `null` and degraded when classification is unavailable or the
 * organization's classification budget is spent, so the assessment never fails because of it.
 */
export async function assessmentContentScores(
  deps: RiskDeps,
  environment: LookupEnvironment,
  text: string | undefined,
): Promise<{ scores: ContentScores | null; degraded: boolean }> {
  if (text === undefined) return { scores: null, degraded: false };
  try {
    if (environment.mode === "live" && deps.chargeClassification) {
      const allowed = await deps.chargeClassification(environment.organizationId);
      if (!allowed) return { scores: null, degraded: true };
    }
    return { scores: (await classifyContent(deps, environment, text)).scores, degraded: false };
  } catch {
    return { scores: null, degraded: true };
  }
}
