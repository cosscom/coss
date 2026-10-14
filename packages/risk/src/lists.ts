/**
 * An environment's allow and block lists. Values are normalized on the way in (emails to their
 * mailbox, domains to ASCII, IPs and ranges to canonical CIDR, ASNs to numbers, countries to upper
 * case) so matching is exact; an allow-list match decides `allow`, a block-list match `block`.
 */
import { domainToASCII } from "node:url";
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { canonicalEmail, domainAndParents, emailSyntaxProblem } from "@coss/signals/email";
import { formatCidr, formatIp, parseCidr } from "@coss/signals/ip";
import { and, desc, eq, gt, isNull, lt, or, type SQL, sql } from "drizzle-orm";
import { RiskError } from "./errors.ts";
import {
  type CreateRiskListEntryRequestOutput,
  DEFAULT_RISK_LIST_LIMIT,
  type ListRiskListEntriesQueryOutput,
  MAX_RISK_LIST_LIMIT,
  type RiskList,
  type RiskListEntryListOutput,
  type RiskListEntryOutput,
  type RiskListEntryType,
} from "./schemas.ts";

const { riskListEntry } = schema;

export type RiskListEntryRow = typeof riskListEntry.$inferSelect;

type Scope = { organizationId: string; environmentId: string };

/** The broadest ranges a list entry may cover (a /0 would decide every assessment). */
const MIN_PREFIX = { 4: 8, 6: 16 } as const;

function invalid(message: string): never {
  throw new RiskError("invalid_list_value", message, { param: "value" });
}

/** The stored `value` (and `network` for IPs) of an entry, or a `RiskError`. */
export function normalizeListValue(
  type: RiskListEntryType,
  input: string,
): { value: string; network: string | null } {
  const raw = input.trim();
  switch (type) {
    case "email": {
      if (emailSyntaxProblem(raw)) invalid("Not a valid email address.");
      const at = raw.lastIndexOf("@");
      const domain = domainToASCII(raw.slice(at + 1).toLowerCase());
      return { value: canonicalEmail(`${raw.slice(0, at)}@${domain}`), network: null };
    }
    case "domain": {
      const name = raw.toLowerCase().replace(/^\*\./, "").replace(/^@/, "").replace(/\.$/, "");
      const ascii = domainToASCII(name);
      if (!ascii || emailSyntaxProblem(`x@${ascii}`)) invalid("Not a valid domain name.");
      return { value: ascii, network: null };
    }
    case "ip": {
      const network = parseCidr(raw);
      if (!network) invalid("Not a valid IP address or CIDR range.");
      if (network.prefix < MIN_PREFIX[network.version]) {
        invalid(
          `IPv${network.version} ranges must be /${MIN_PREFIX[network.version]} or narrower.`,
        );
      }
      const full = network.version === 4 ? 32 : 128;
      const value =
        network.prefix === full
          ? formatIp({ version: network.version, value: network.start })
          : formatCidr(network);
      return { value, network: formatCidr(network) };
    }
    case "asn": {
      const match = /^(?:as)?(\d{1,10})$/i.exec(raw);
      const asn = match ? Number(match[1]) : Number.NaN;
      if (!Number.isSafeInteger(asn) || asn < 1 || asn > 4_294_967_295) {
        invalid("Not a valid AS number (e.g. AS64500 or 64500).");
      }
      return { value: String(asn), network: null };
    }
    case "country": {
      if (!/^[a-z]{2}$/i.test(raw)) invalid("Use an ISO 3166-1 alpha-2 country code, e.g. DE.");
      return { value: raw.toUpperCase(), network: null };
    }
    case "user": {
      if (raw.length < 1 || raw.length > 256) invalid("User ids are 1-256 characters.");
      return { value: raw, network: null };
    }
  }
}

export function toRiskListEntryObject(row: RiskListEntryRow): RiskListEntryOutput {
  return {
    object: "risk_list_entry",
    id: row.id,
    list: row.list,
    type: row.type,
    value: row.value,
    note: row.note,
    expires_at: row.expiresAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

function inScope(scope: Scope): SQL | undefined {
  return and(
    eq(riskListEntry.organizationId, scope.organizationId),
    eq(riskListEntry.environmentId, scope.environmentId),
  );
}

/**
 * Adds an entry, or returns the existing one for the same list, type and value unchanged (adding
 * is idempotent). `null` when the environment isn't in the organization.
 */
export async function addRiskListEntry(
  scope: Scope,
  params: CreateRiskListEntryRequestOutput,
): Promise<{ entry: RiskListEntryOutput; created: boolean } | null> {
  const { value, network } = normalizeListValue(params.type, params.value);
  const [environment] = await db
    .select({ projectId: schema.environment.projectId })
    .from(schema.environment)
    .where(
      and(
        eq(schema.environment.id, scope.environmentId),
        eq(schema.environment.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  if (!environment) return null;
  const [inserted] = await db
    .insert(riskListEntry)
    .values({
      organizationId: scope.organizationId,
      projectId: environment.projectId,
      environmentId: scope.environmentId,
      list: params.list,
      type: params.type,
      value,
      network,
      note: params.note ?? null,
      expiresAt: params.expires_at ? new Date(params.expires_at) : null,
    })
    .onConflictDoNothing({
      target: [
        riskListEntry.environmentId,
        riskListEntry.list,
        riskListEntry.type,
        riskListEntry.value,
      ],
    })
    .returning();
  if (inserted) return { entry: toRiskListEntryObject(inserted), created: true };
  const [existing] = await db
    .select()
    .from(riskListEntry)
    .where(
      and(
        inScope(scope),
        eq(riskListEntry.list, params.list),
        eq(riskListEntry.type, params.type),
        eq(riskListEntry.value, value),
      ),
    )
    .limit(1);
  // Removed again between the insert and the select: try once more.
  if (!existing) return addRiskListEntry(scope, params);
  return { entry: toRiskListEntryObject(existing), created: false };
}

export async function getRiskListEntry(
  scope: Scope,
  id: string,
): Promise<RiskListEntryOutput | null> {
  if (!isId("rskle", id)) return null;
  const [row] = await db
    .select()
    .from(riskListEntry)
    .where(and(inScope(scope), eq(riskListEntry.id, id)))
    .limit(1);
  return row ? toRiskListEntryObject(row) : null;
}

/** Deletes an entry; `null` when there is none with that id in the environment. */
export async function removeRiskListEntry(
  scope: Scope,
  id: string,
): Promise<RiskListEntryOutput | null> {
  if (!isId("rskle", id)) return null;
  const [row] = await db
    .delete(riskListEntry)
    .where(and(inScope(scope), eq(riskListEntry.id, id)))
    .returning();
  return row ? toRiskListEntryObject(row) : null;
}

/** Newest first. An unknown `after` cursor gives an empty page. */
export async function listRiskListEntries(
  scope: Scope,
  query: ListRiskListEntriesQueryOutput = {},
): Promise<RiskListEntryListOutput> {
  const limit = Math.min(query.limit ?? DEFAULT_RISK_LIST_LIMIT, MAX_RISK_LIST_LIMIT);
  const empty: RiskListEntryListOutput = { object: "list", data: [], has_more: false };
  if (query.after !== undefined && !isId("rskle", query.after)) return empty;
  const [cursor] = query.after
    ? await db
        .select({
          createdAt: sql<string>`${riskListEntry.createdAt}::text`,
          sequence: riskListEntry.sequence,
        })
        .from(riskListEntry)
        .where(and(inScope(scope), eq(riskListEntry.id, query.after)))
        .limit(1)
    : [];
  if (query.after && !cursor) return empty;
  const rows = await db
    .select()
    .from(riskListEntry)
    .where(
      and(
        inScope(scope),
        query.list === undefined ? undefined : eq(riskListEntry.list, query.list),
        query.type === undefined ? undefined : eq(riskListEntry.type, query.type),
        cursor
          ? or(
              lt(riskListEntry.createdAt, sql`${cursor.createdAt}::timestamptz`),
              and(
                eq(riskListEntry.createdAt, sql`${cursor.createdAt}::timestamptz`),
                lt(riskListEntry.sequence, cursor.sequence),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(riskListEntry.createdAt), desc(riskListEntry.sequence))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toRiskListEntryObject),
    has_more: rows.length > limit,
  };
}

/** What an assessment can match a list on (all optional). */
export type ListSubject = {
  /** `canonicalEmail` of a valid address. */
  mailbox?: string | null;
  /** The email domain (ASCII); its parent domains match too. */
  domain?: string | null;
  ip?: string | null;
  asn?: number | null;
  country?: string | null;
  userId?: string | null;
};

export type ListMatch = { id: string; list: RiskList; type: RiskListEntryType };

/** Unexpired entries matching any of `subject`'s values, in one query. */
export async function matchListEntries(
  executor: Executor,
  scope: Scope,
  subject: ListSubject,
  now: Date = new Date(),
): Promise<ListMatch[]> {
  const conditions: SQL[] = [];
  const typed = (type: RiskListEntryType, condition: SQL) =>
    and(eq(riskListEntry.type, type), condition) as SQL;
  if (subject.mailbox) conditions.push(typed("email", eq(riskListEntry.value, subject.mailbox)));
  if (subject.domain) {
    const names = domainAndParents(subject.domain);
    if (names.length > 0) {
      conditions.push(
        typed("domain", sql`${riskListEntry.value} = any(${sql.param(names)}::text[])`),
      );
    }
  }
  if (subject.ip) {
    conditions.push(typed("ip", sql`${riskListEntry.network} >>= ${subject.ip}::inet`));
  }
  if (subject.asn) conditions.push(typed("asn", eq(riskListEntry.value, String(subject.asn))));
  if (subject.country) conditions.push(typed("country", eq(riskListEntry.value, subject.country)));
  if (subject.userId) conditions.push(typed("user", eq(riskListEntry.value, subject.userId)));
  if (conditions.length === 0) return [];
  return executor
    .select({ id: riskListEntry.id, list: riskListEntry.list, type: riskListEntry.type })
    .from(riskListEntry)
    .where(
      and(
        inScope(scope),
        or(isNull(riskListEntry.expiresAt), gt(riskListEntry.expiresAt, now)),
        or(...conditions),
      ),
    );
}
