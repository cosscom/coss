/**
 * Sending domains: organization-owned identities with Easy DKIM and a custom MAIL FROM
 * subdomain, verified by the provider and re-checked by the worker.
 */

import type { PlanGate } from "@coss/billing/gate";
import { isOnBillingHold } from "@coss/billing/metering";
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { isSuspended } from "@coss/reputation";
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
} from "drizzle-orm";
import { checkBimi, organizationalDomain, toBimiObject } from "./bimi.ts";
import { releaseOrganizationDedicatedIps } from "./dedicated-ips.ts";
import { appliedDmarcRecord, dmarcPolicyKey } from "./dmarc-record.ts";
import { deleteOrganizationDmarcReports } from "./dmarc-reports.ts";
import { checkDomainDns, type DnsResolver, dmarcRecordAt, expectedRecords } from "./dns.ts";
import { DomainError, EmailError } from "./errors.ts";
import type { InboundContentStore } from "./inbound-store.ts";
import {
  type DedicatedIpProvider,
  type IdentityProvider,
  IdentityTakenError,
  type ProviderTenant,
} from "./provider.ts";
import {
  DOMAIN_NAME_MAX_LENGTH,
  type DomainObjectOutput,
  parseEmailAddress,
  type ReceivingDomainObjectOutput,
  type TrackingDomainObjectOutput,
} from "./schemas.ts";
import type { TrackingHostnameProvider } from "./tracking-hostnames.ts";

const { domain, emailTenant, ssoProvider, trackingDomain } = schema;

export type DomainRow = typeof domain.$inferSelect;
export type EmailTenantRow = typeof emailTenant.$inferSelect;
export type DomainRecord = DomainRow["records"][number];

export type DomainDeps = {
  identity: IdentityProvider;
  dns: DnsResolver | null;
  /** Serves custom tracking hostnames (`tracking-domains.ts`). */
  tracking: TrackingHostnameProvider;
  /** Dedicated IP pools (`dedicated-ips.ts`); unset: none are released with the organization. */
  dedicatedIps?: DedicatedIpProvider;
  /** The organization's plan (domains, tracking domains); unset: nothing is limited (tests). */
  plans?: PlanGate;
  /**
   * The managed inbound domain DMARC reports are received at (`INBOUND_MANAGED_DOMAIN`); unset or
   * `null`: receiving is off, and the recommended DMARC record names no report address.
   */
  dmarcReportDomain?: string | null;
};

/** Subdomain used as the envelope sender (bounces and complaints come back to it). */
export const MAIL_FROM_SUBDOMAIN = "send";
export const MAX_PENDING_DOMAINS = 5;
/** The provider gives up verifying after 72 hours; so do we. */
export const VERIFICATION_WINDOW_MS = 72 * 60 * 60 * 1000;
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const RESERVED_SUFFIXES = ["amazonses.com", "amazonaws.com", "coss.com", "coss.dev"];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Lower-cased, trailing-dot-free domain name, or a `DomainError` explaining why it is invalid.
 * `allowReserved` admits coss.com's and AWS's own domains (`RESERVED_SUFFIXES`): only for platform
 * admins setting up coss.com's own organization (its sending domain is coss.com).
 */
export function normalizeDomainName(
  input: string,
  options: { allowReserved?: boolean } = {},
): string {
  const name = input.trim().toLowerCase().replace(/\.$/, "");
  const labels = name.split(".");
  const invalid = (message: string) => new DomainError("invalid_domain", message);
  if (!name) throw invalid("Enter a domain name, like acme.com.");
  if (/\P{ASCII}/u.test(name)) {
    throw invalid("Internationalized domains must be punycode-encoded (xn--…).");
  }
  if (
    name.length > DOMAIN_NAME_MAX_LENGTH ||
    labels.length < 2 ||
    !labels.every((l) => LABEL.test(l))
  ) {
    throw invalid(
      "Enter a valid domain name, like acme.com or mail.acme.com (no https:// or paths).",
    );
  }
  if (/^\d+$/.test(labels.at(-1) ?? "")) throw invalid("IP addresses can't be used as domains.");
  if (
    !options.allowReserved &&
    RESERVED_SUFFIXES.some((suffix) => name === suffix || name.endsWith(`.${suffix}`))
  ) {
    throw invalid("This domain can't be used.");
  }
  if (labels[0] === MAIL_FROM_SUBDOMAIN) {
    throw invalid(`"${MAIL_FROM_SUBDOMAIN}." subdomains are reserved for bounce handling.`);
  }
  return name;
}

/**
 * The DNS records of a domain: the latest check, or what to publish if never checked
 * (`dmarcReportDomain`: see `DomainDeps`).
 */
export function domainRecords(
  row: DomainRow,
  dmarcReportDomain: string | null = null,
): DomainRecord[] {
  return row.records.length > 0 ? row.records : expectedRecords(row, dmarcReportDomain);
}

/**
 * The domain's public wire representation, including the records to publish. `tracking` and
 * `receiving` are its tracking and receiving domains' (`domainObjects` in `tracking-domains.ts`
 * loads all three).
 */
export function toDomainObject(
  row: DomainRow,
  tracking: TrackingDomainObjectOutput | null = null,
  receiving: ReceivingDomainObjectOutput | null = null,
  dmarcReportDomain: string | null = null,
): DomainObjectOutput {
  return {
    object: "domain",
    id: row.id,
    name: row.name,
    status: row.status,
    can_send: row.canSend,
    region: row.region,
    mail_from_domain: row.mailFromDomain,
    mail_from_status: row.mailFromStatus,
    records: domainRecords(row, dmarcReportDomain),
    created_at: row.createdAt.toISOString(),
    last_checked_at: row.lastCheckedAt?.toISOString() ?? null,
    verified_at: row.verifiedAt?.toISOString() ?? null,
    failed_at: row.failedAt?.toISOString() ?? null,
    tracking,
    receiving,
    bimi: toBimiObject(row),
  };
}

/** When the worker should check a domain next (`null`: never). */
export function nextCheckAt(
  row: Pick<DomainRow, "status" | "verificationStartedAt">,
  now: Date,
): Date | null {
  switch (row.status) {
    case "verified":
      return new Date(now.getTime() + 12 * HOUR);
    case "pending":
    case "temporary_failure": {
      const age = now.getTime() - row.verificationStartedAt.getTime();
      return new Date(now.getTime() + (age < HOUR ? MINUTE : 10 * MINUTE));
    }
    default:
      return null;
  }
}

export async function getEmailTenant(organizationId: string): Promise<EmailTenantRow | null> {
  const [row] = await db
    .select()
    .from(emailTenant)
    .where(eq(emailTenant.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

function tenantOf(row: EmailTenantRow): ProviderTenant {
  return { tenantName: row.tenantName, tenantArn: row.tenantArn };
}

/** The organization's provider tenant, created on first use. */
export async function ensureOrgTenant(
  organizationId: string,
  identity: IdentityProvider,
): Promise<ProviderTenant> {
  const existing = await getEmailTenant(organizationId);
  if (existing?.provider === identity.name) return tenantOf(existing);
  const tenant = await identity.ensureTenant({ organizationId });
  await db
    .insert(emailTenant)
    .values({ organizationId, provider: identity.name, ...tenant })
    .onConflictDoUpdate({
      target: emailTenant.organizationId,
      set: { provider: identity.name, ...tenant },
    });
  return tenant;
}

export async function listDomains(input: { organizationId: string }): Promise<DomainRow[]> {
  return db
    .select()
    .from(domain)
    .where(eq(domain.organizationId, input.organizationId))
    .orderBy(asc(domain.name));
}

export async function getDomain(input: {
  organizationId: string;
  id: string;
}): Promise<DomainRow | null> {
  if (!isId("dom", input.id)) return null;
  const [row] = await db
    .select()
    .from(domain)
    .where(and(eq(domain.organizationId, input.organizationId), eq(domain.id, input.id)))
    .limit(1);
  return row ?? null;
}

export async function requireDomain(input: {
  organizationId: string;
  id: string;
}): Promise<DomainRow> {
  const row = await getDomain(input);
  if (!row) throw new DomainError("not_found", "Domain not found.");
  return row;
}

export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } }).cause;
  return (error as { code?: string }).code === "23505" || cause?.code === "23505";
}

async function takenError(organizationId: string, name: string): Promise<DomainError> {
  const [holder] = await db
    .select({ organizationId: domain.organizationId })
    .from(domain)
    .where(and(eq(domain.name, name), ne(domain.status, "failed")))
    .limit(1);
  return new DomainError(
    "domain_taken",
    holder?.organizationId === organizationId
      ? `${name} has already been added.`
      : `${name} is already in use by another account.`,
  );
}

/**
 * Provisions the provider identity for a claimed (`pending`) row and stores its DKIM tokens.
 * Releases the claim when the provider refuses: a new row is removed, a restarted one fails again.
 */
async function provision(
  row: DomainRow,
  deps: DomainDeps,
  onFailure: "delete" | "fail",
): Promise<DomainRow> {
  try {
    const tenant = await ensureOrgTenant(row.organizationId, deps.identity);
    const identity = await deps.identity.createDomainIdentity({
      tenant,
      domain: row.name,
      mailFromDomain: row.mailFromDomain,
    });
    const now = new Date();
    const [updated] = await db
      .update(domain)
      .set({
        dkimTokens: identity.dkimTokens,
        dkimHostedZone: identity.dkimHostedZone,
        region: identity.region,
        records: [],
        nextCheckAt: nextCheckAt({ status: "pending", verificationStartedAt: now }, now),
      })
      .where(and(eq(domain.id, row.id), eq(domain.organizationId, row.organizationId)))
      .returning();
    if (!updated) throw new DomainError("not_found", "Domain not found.");
    return updated;
  } catch (error) {
    const scope = and(eq(domain.id, row.id), eq(domain.organizationId, row.organizationId));
    if (onFailure === "delete") await db.delete(domain).where(scope);
    else {
      await db
        .update(domain)
        .set({ status: "failed", failedAt: new Date(), nextCheckAt: null })
        .where(scope);
    }
    if (error instanceof DomainError) throw error;
    if (error instanceof IdentityTakenError) {
      throw new DomainError("domain_taken", `${row.name} is already in use by another account.`);
    }
    console.error(`[email:domains] provisioning ${row.name} failed:`, error);
    throw new DomainError("provider_error", "The domain could not be set up. Try again shortly.");
  }
}

async function assertPendingCapacity(organizationId: string): Promise<void> {
  const [pending] = await db
    .select({ value: count() })
    .from(domain)
    .where(
      and(
        eq(domain.organizationId, organizationId),
        inArray(domain.status, ["pending", "temporary_failure"]),
      ),
    );
  if ((pending?.value ?? 0) >= MAX_PENDING_DOMAINS) {
    throw new DomainError(
      "too_many_pending_domains",
      `You can have at most ${MAX_PENDING_DOMAINS} domains awaiting verification.`,
    );
  }
}

/** Claims the name for the organization and creates its provider identity. */
export async function createDomain(
  input: {
    organizationId: string;
    name: string;
    userId: string | null;
    /** Platform admins only (the dashboard checks): see `normalizeDomainName`. */
    allowReserved?: boolean;
  },
  deps: DomainDeps,
): Promise<DomainRow> {
  const name = normalizeDomainName(input.name, { allowReserved: input.allowReserved });
  await assertPendingCapacity(input.organizationId);
  if (deps.plans) {
    const [existing] = await db
      .select({ value: count() })
      .from(domain)
      .where(and(eq(domain.organizationId, input.organizationId), ne(domain.status, "failed")));
    await deps.plans.requireCapacity(input.organizationId, "domains", existing?.value ?? 0);
  }
  let claimed: DomainRow | undefined;
  try {
    [claimed] = await db
      .insert(domain)
      .values({
        organizationId: input.organizationId,
        name,
        provider: deps.identity.name,
        mailFromDomain: `${MAIL_FROM_SUBDOMAIN}.${name}`,
        createdByUserId: input.userId,
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) throw await takenError(input.organizationId, name);
    throw error;
  }
  if (!claimed) throw new Error("Domain insert returned no row.");
  return provision(claimed, deps, "delete");
}

/** Starts verification over for a `failed` domain, with a new identity and new DKIM tokens. */
export async function restartDomainVerification(
  input: { organizationId: string; id: string },
  deps: DomainDeps,
): Promise<DomainRow> {
  const row = await requireDomain(input);
  if (row.status !== "failed") return row;
  await assertPendingCapacity(input.organizationId);
  let claimed: DomainRow | undefined;
  try {
    [claimed] = await db
      .update(domain)
      .set({
        status: "pending",
        canSend: false,
        provider: deps.identity.name,
        mailFromStatus: "pending",
        records: [],
        bimi: null,
        verificationStartedAt: new Date(),
        failedAt: null,
      })
      .where(
        and(
          eq(domain.id, row.id),
          eq(domain.organizationId, row.organizationId),
          eq(domain.status, "failed"),
        ),
      )
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) throw await takenError(input.organizationId, row.name);
    throw error;
  }
  if (!claimed) return requireDomain(input);
  return provision(claimed, deps, "fail");
}

/**
 * Asks the provider for the identity's state, checks DNS, and stores both. A domain that stays
 * unverified past the verification window (or whose identity is gone) fails and releases its
 * identity, so the name can be claimed again.
 */
export async function checkDomain(
  input: { organizationId: string; id: string; now?: Date },
  deps: DomainDeps,
): Promise<DomainRow> {
  const row = await requireDomain(input);
  // Another provider's domain (e.g. a fake one after switching to SES) can't be checked here.
  if (row.status === "failed" || row.status === "deleting" || row.provider !== deps.identity.name) {
    return row;
  }
  const now = input.now ?? new Date();
  const state = await deps.identity.getDomainIdentity(row.name);

  let status: DomainRow["status"] = state?.status ?? "failed";
  // A domain that never verified gives up after the window; a verified one follows the provider.
  const expired =
    !row.verifiedAt && now.getTime() - row.verificationStartedAt.getTime() > VERIFICATION_WINDOW_MS;
  if (status !== "verified" && expired) status = "failed";

  const identity = {
    dkimTokens: state?.dkimTokens.length ? state.dkimTokens : row.dkimTokens,
    dkimHostedZone: state?.dkimHostedZone ?? row.dkimHostedZone,
    region: state?.region ?? row.region,
  };
  const [{ records, dmarc, dmarcAbsent }, bimi] = await Promise.all([
    checkDomainDns(
      expectedRecords({ ...row, ...identity }, deps.dmarcReportDomain ?? null),
      deps.dns,
    ),
    checkBimi(row.name, deps.dns),
  ]);
  // A subdomain with no DMARC record of its own gets its organizational domain's (`undefined`:
  // that lookup failed, so the stored one stays).
  const organizational = organizationalDomain(row.name);
  const inherited =
    dmarcAbsent && deps.dns && organizational !== row.name
      ? await dmarcRecordAt(organizational, deps.dns)
      : null;
  const dmarcInheritedRecord = inherited === undefined ? row.dmarcInheritedRecord : inherited;
  // `undefined`: DNS couldn't be asked, so the stored record (and its policy's start) stays.
  const dmarcState =
    dmarc === undefined
      ? {}
      : {
          dmarcRecord: dmarc,
          dmarcInheritedRecord,
          dmarcPolicyChangedAt:
            row.dmarcPolicyChangedAt &&
            dmarcPolicyKey(appliedDmarcRecord(row)) ===
              dmarcPolicyKey(appliedDmarcRecord({ dmarcRecord: dmarc, dmarcInheritedRecord }))
              ? row.dmarcPolicyChangedAt
              : now,
        };

  if (status === "failed" && state) {
    try {
      const tenant = await getEmailTenant(row.organizationId);
      await deps.identity.deleteDomainIdentity({
        tenant: tenant ? tenantOf(tenant) : { tenantName: "", tenantArn: null },
        domain: row.name,
      });
    } catch (error) {
      console.error(`[email:domains] releasing ${row.name} failed:`, error);
    }
  }

  const [updated] = await db
    .update(domain)
    .set({
      ...identity,
      status,
      canSend: status === "verified" && (state?.canSend ?? false),
      mailFromStatus: state?.mailFromStatus ?? row.mailFromStatus,
      records,
      ...dmarcState,
      bimi,
      lastCheckedAt: now,
      nextCheckAt: nextCheckAt({ status, verificationStartedAt: row.verificationStartedAt }, now),
      verifiedAt: status === "verified" ? (row.verifiedAt ?? now) : row.verifiedAt,
      failedAt: status === "failed" ? now : null,
    })
    .where(
      and(
        eq(domain.id, row.id),
        eq(domain.organizationId, row.organizationId),
        notInArray(domain.status, ["failed", "deleting"]),
      ),
    )
    .returning();
  return updated ?? requireDomain(input);
}

/**
 * Whether the organization's SSO provider lists the domain. SSO only accepts addresses on verified
 * email domains of the organization, so deleting one would end SSO sign-in for its people (and
 * lock members out while the organization requires SSO). `sso_provider.domain` is comma-joined.
 */
async function usedBySso(organizationId: string, name: string): Promise<boolean> {
  const providers = await db
    .select({ domain: ssoProvider.domain })
    .from(ssoProvider)
    .where(eq(ssoProvider.organizationId, organizationId));
  return providers.some((provider) =>
    provider.domain.split(",").some((entry) => entry.trim().toLowerCase() === name),
  );
}

/**
 * Removes the domain's tracking hostname at its provider (the row goes with the domain). Links in
 * emails already sent from it stop working.
 */
async function releaseTrackingHostname(
  row: Pick<DomainRow, "id" | "organizationId">,
  deps: Pick<DomainDeps, "tracking">,
  assertLease: () => Promise<void> = async () => {},
): Promise<void> {
  const [tracked] = await db
    .select()
    .from(trackingDomain)
    .where(
      and(
        eq(trackingDomain.domainId, row.id),
        eq(trackingDomain.organizationId, row.organizationId),
      ),
    )
    .limit(1);
  if (!tracked?.providerHostnameId || tracked.provider !== deps.tracking.name) return;
  try {
    await deps.tracking.delete(tracked.providerHostnameId);
  } catch (error) {
    console.error(`[email:domains] releasing ${tracked.hostname} failed:`, error);
    throw new DomainError("provider_error", "The domain could not be removed. Try again shortly.");
  }
  await assertLease();
  await db
    .update(trackingDomain)
    .set({ status: "failed", failedAt: new Date(), providerHostnameId: null, nextCheckAt: null })
    .where(eq(trackingDomain.id, tracked.id));
}

/** Removes the provider identity, then the domain. Sent emails are unaffected. */
export async function deleteDomain(
  input: { organizationId: string; id: string },
  deps: DomainDeps,
): Promise<void> {
  const row = await requireDomain(input);
  if (await usedBySso(row.organizationId, row.name)) {
    throw new DomainError(
      "domain_in_use_by_sso",
      `${row.name} is used by this organization's single sign-on. Remove it from the SSO ` +
        "provider first.",
    );
  }
  const scope = and(eq(domain.id, row.id), eq(domain.organizationId, row.organizationId));
  await releaseTrackingHostname(row, deps);
  if (row.status !== "failed") {
    // Stops sends from this domain before the identity disappears.
    await db.update(domain).set({ status: "deleting", canSend: false }).where(scope);
    try {
      const tenant = await getEmailTenant(row.organizationId);
      await deps.identity.deleteDomainIdentity({
        tenant: tenant ? tenantOf(tenant) : { tenantName: "", tenantArn: null },
        domain: row.name,
      });
    } catch (error) {
      await db.update(domain).set({ status: row.status, canSend: row.canSend }).where(scope);
      console.error(`[email:domains] deleting ${row.name} failed:`, error);
      throw new DomainError(
        "provider_error",
        "The domain could not be removed. Try again shortly.",
      );
    }
  }
  await db.delete(domain).where(scope);
}

/**
 * Organization deletion (worker, `OrganizationTeardownDeps.releaseProviderResources`): stops the
 * organization's sends, deletes its received emails' content and its DMARC reports, removes its
 * domains' provider identities and the domains, its dedicated IP pool, then its tenant.
 * Idempotent; a failure leaves the rest for the retry. `failed` domains have no identity of
 * theirs (the name may be another organization's by now), so only their rows go.
 */
export async function releaseOrganizationEmailResources(
  organizationId: string,
  deps: Pick<DomainDeps, "identity" | "tracking" | "dedicatedIps"> & {
    /** Received emails' content store (`EmailRuntime.inbound`); its rows go with the data. */
    inboundStore?: InboundContentStore | null;
  },
  assertLease: () => Promise<void> = async () => {},
): Promise<void> {
  await assertLease();
  // At once, so scheduled sends due meanwhile are refused (`authorizeLiveSender`).
  await db
    .update(domain)
    .set({ status: "deleting", canSend: false })
    .where(and(eq(domain.organizationId, organizationId), ne(domain.status, "failed")));
  if (deps.inboundStore) {
    // Nothing more is received for an organization being deleted (`routeRecipients`).
    await assertLease();
    await deps.inboundStore.deleteOrganization(organizationId);
  }
  // In batches, before the domains: deleting a domain would cascade into all its report rows.
  await deleteOrganizationDmarcReports(organizationId, assertLease);
  const tenantRow = await getEmailTenant(organizationId);
  const tenant = tenantRow ? tenantOf(tenantRow) : { tenantName: "", tenantArn: null };
  const rows = await db
    .select({ id: domain.id, name: domain.name, status: domain.status, provider: domain.provider })
    .from(domain)
    .where(eq(domain.organizationId, organizationId));
  for (const row of rows) {
    await assertLease();
    await releaseTrackingHostname({ id: row.id, organizationId }, deps, assertLease);
    await assertLease();
    // Identities of another provider (e.g. fake domains in an SES deployment) aren't ours to touch.
    if (row.status !== "failed" && row.provider === deps.identity.name) {
      await deps.identity.deleteDomainIdentity({ tenant, domain: row.name });
    }
    await assertLease();
    await db
      .delete(domain)
      .where(and(eq(domain.id, row.id), eq(domain.organizationId, organizationId)));
  }
  // Before the tenant: SES won't delete a configuration set still associated with one.
  await assertLease();
  await releaseOrganizationDedicatedIps(organizationId, deps.dedicatedIps);
  if (tenantRow) {
    await assertLease();
    if (tenantRow.provider === deps.identity.name) await deps.identity.deleteTenant(tenant);
    await assertLease();
    await db.delete(emailTenant).where(eq(emailTenant.organizationId, organizationId));
  }
}

/**
 * System-level (worker): checks domains that are due, oldest first. Each is leased by moving its
 * `next_check_at` forward first, so concurrent workers never check the same domain at once.
 * `scope` limits the scan to some organizations (tests). Once `signal` aborts (the worker is
 * shutting down), no further domain is leased; the rest stay due for the next run.
 */
export async function recheckDueDomains(
  opts: {
    now?: Date;
    limit?: number;
    scope?: { organizationIds: string[] };
    signal?: AbortSignal;
  },
  deps: DomainDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select({
      id: domain.id,
      organizationId: domain.organizationId,
      nextCheckAt: domain.nextCheckAt,
    })
    .from(domain)
    .where(
      and(
        isNotNull(domain.nextCheckAt),
        lte(domain.nextCheckAt, now),
        notInArray(domain.status, ["failed", "deleting"]),
        eq(domain.provider, deps.identity.name),
        opts.scope ? inArray(domain.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(domain.nextCheckAt))
    .limit(opts.limit ?? 25);
  let checked = 0;
  for (const candidate of due) {
    if (opts.signal?.aborted) break;
    if (!candidate.nextCheckAt) continue;
    const [leased] = await db
      .update(domain)
      .set({ nextCheckAt: new Date(now.getTime() + 5 * MINUTE) })
      .where(and(eq(domain.id, candidate.id), eq(domain.nextCheckAt, candidate.nextCheckAt)))
      .returning({ id: domain.id });
    if (!leased) continue;
    try {
      await checkDomain({ organizationId: candidate.organizationId, id: candidate.id, now }, deps);
      checked++;
    } catch (error) {
      console.error(`[email:domains] checking ${candidate.id} failed:`, error);
    }
  }
  return checked;
}

/** Every suffix of `name` that is a valid domain (`a.b.c` → `a.b.c`, `b.c`). */
export function domainSuffixes(name: string): string[] {
  const labels = name.split(".");
  return labels.slice(0, -1).map((_, index) => labels.slice(index).join("."));
}

/**
 * The most specific domain across organizations decides who owns a hostname, as it does for
 * senders: a tracking or receiving domain can't sit under another organization's (more specific)
 * domain.
 */
export async function assertOwnsHostname(
  parent: DomainRow,
  hostname: string,
  feature: "tracking" | "receiving" = "tracking",
): Promise<void> {
  const candidates = await db
    .select({ id: domain.id, name: domain.name })
    .from(domain)
    .where(and(inArray(domain.name, domainSuffixes(hostname)), ne(domain.status, "failed")));
  const match = candidates.sort((a, b) => b.name.length - a.name.length)[0];
  if (match && match.id !== parent.id) {
    throw new DomainError(
      feature === "tracking" ? "invalid_tracking_hostname" : "invalid_receiving_hostname",
      `${hostname} belongs to the domain ${match.name}; set its ${feature} domain up there instead.`,
    );
  }
}

/**
 * System-level: refuses a live send unless the From domain is covered by a domain of the
 * organization verified by the live provider, the reputation guard has not suspended the
 * organization, and its tenant is not paused. The most specific matching domain across all
 * organizations decides, because the provider signs with the most specific identity.
 */
export async function authorizeLiveSender(input: {
  organizationId: string;
  from: string;
  /** The live provider: only domains it verified count. */
  provider: string;
}): Promise<void> {
  // Checked first: a suspended organization is told so whatever it sends from.
  if (await isSuspended(input.organizationId)) {
    throw new EmailError(
      "account_suspended",
      "Live sending is suspended for this organization because of its sending reputation " +
        "(high bounce or complaint rates). Sandbox keys still work. Contact support to resume.",
    );
  }
  // A billing hold is not a suspension: paying (or the next period) lifts it.
  if (await isOnBillingHold(input.organizationId)) {
    throw new EmailError(
      "billing_hold",
      "Live sending is paused for this organization: an invoice is overdue or its spend limit " +
        "was reached. Sandbox keys still work. See the organization's billing settings.",
    );
  }
  const address = parseEmailAddress(input.from).address.toLowerCase();
  const fromDomain = address.slice(address.lastIndexOf("@") + 1);
  const candidates = await db
    .select({
      name: domain.name,
      organizationId: domain.organizationId,
      status: domain.status,
      canSend: domain.canSend,
      provider: domain.provider,
      mailFromDomain: domain.mailFromDomain,
    })
    .from(domain)
    .where(and(inArray(domain.name, domainSuffixes(fromDomain)), ne(domain.status, "failed")));
  const match = candidates.sort((a, b) => b.name.length - a.name.length)[0];
  const usable =
    match &&
    match.organizationId === input.organizationId &&
    match.status === "verified" &&
    match.canSend &&
    match.provider === input.provider &&
    fromDomain !== match.mailFromDomain &&
    !fromDomain.endsWith(`.${match.mailFromDomain}`);
  if (!usable) {
    throw new EmailError(
      "domain_not_verified",
      `${fromDomain} is not a verified domain of this organization. Add and verify it under ` +
        "Domains in the dashboard, or use a sandbox key to test.",
    );
  }
  const tenant = await getEmailTenant(input.organizationId);
  if (tenant?.sendingStatus === "disabled") {
    throw new EmailError(
      "sending_paused",
      "Sending is paused for this organization because of its sending reputation. Contact support.",
    );
  }
}

/**
 * System-level (worker): records a tenant's sending status reported by the provider (SES pauses
 * tenants with poor reputation). Only tenants named with `tenantPrefix` (this deployment) are
 * touched, and an older report never overwrites a newer one. Returns whether a tenant changed.
 */
export async function applyTenantStatus(
  input: {
    tenantName: string;
    status: EmailTenantRow["sendingStatus"];
    cause: string | null;
    occurredAt: Date;
  },
  tenantPrefix: string,
): Promise<boolean> {
  if (!input.tenantName.startsWith(`${tenantPrefix}-`)) return false;
  const [updated] = await db
    .update(emailTenant)
    .set({
      sendingStatus: input.status,
      statusCause: input.cause,
      statusUpdatedAt: input.occurredAt,
    })
    .where(
      and(
        eq(emailTenant.tenantName, input.tenantName),
        or(isNull(emailTenant.statusUpdatedAt), lt(emailTenant.statusUpdatedAt, input.occurredAt)),
      ),
    )
    .returning({ organizationId: emailTenant.organizationId });
  return Boolean(updated);
}
