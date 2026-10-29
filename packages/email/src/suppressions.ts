/**
 * Suppression lists: one per environment. A send skips every recipient with an entry whose scope
 * is `*` or the email's category; permanent bounces and complaints add `*` entries automatically,
 * one-click unsubscribes an entry for the email's category.
 * coss.com is the only suppression list: SES tenants are created with suppression turned off.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { SIMULATOR_DOMAIN } from "./providers/fake.ts";
import {
  ALL_CATEGORIES,
  type CheckSuppressionQueryOutput,
  CreateSuppressionRequest,
  type CreateSuppressionRequestOutput,
  DEFAULT_SUPPRESSION_LIST_LIMIT,
  type EmailStream,
  type ExportSuppressionsQueryOutput,
  type ListSuppressionsQueryOutput,
  MARKETING_STREAM_SCOPE,
  MAX_SUPPRESSION_LIST_LIMIT,
  type SuppressionCheckOutput,
  type SuppressionImportOutput,
  type SuppressionListOutput,
  type SuppressionOutput,
  type SuppressionReason,
} from "./schemas.ts";
import { suppressionCsvHeader, suppressionCsvRow } from "./suppression-csv.ts";

const { emailSuppression } = schema;

export type SuppressionRow = typeof emailSuppression.$inferSelect;

/**
 * A suppression list: the environment's own, or one of its sub-accounts' (`subaccountId`, already
 * checked to be the environment's).
 */
export type SuppressionEnvironment = {
  organizationId: string;
  environmentId: string;
  subaccountId?: string | null;
};

/** Every entry of the environment, whichever list (lookups by id). */
function inEnvironment(env: SuppressionEnvironment) {
  return and(
    eq(emailSuppression.organizationId, env.organizationId),
    eq(emailSuppression.environmentId, env.environmentId),
  );
}

/** The entries of exactly one list (management: list, add, import, export). */
function inList(env: SuppressionEnvironment) {
  return and(
    inEnvironment(env),
    env.subaccountId
      ? eq(emailSuppression.subaccountId, env.subaccountId)
      : isNull(emailSuppression.subaccountId),
  );
}

/** The entries a send applies: a sub-account's sends skip its own and the environment's. */
function inSendLists(env: SuppressionEnvironment) {
  return and(
    inEnvironment(env),
    env.subaccountId
      ? or(
          isNull(emailSuppression.subaccountId),
          eq(emailSuppression.subaccountId, env.subaccountId),
        )
      : isNull(emailSuppression.subaccountId),
  );
}

const ON_LIST = [
  emailSuppression.environmentId,
  emailSuppression.subaccountId,
  emailSuppression.address,
  emailSuppression.scope,
];

/** Scopes that suppress an email with `category` (`*` alone when it has none). */
/** The entries that suppress an email of `category` in `stream`. */
function matchingScopes(
  category: string | null | undefined,
  stream: EmailStream = "transactional",
): string[] {
  const scopes = [ALL_CATEGORIES];
  if (stream === "marketing") scopes.push(MARKETING_STREAM_SCOPE);
  if (category) scopes.push(category);
  return scopes;
}

export function toSuppressionObject(row: SuppressionRow): SuppressionOutput {
  return {
    object: "suppression",
    id: row.id,
    address: row.address,
    scope: row.scope,
    reason: row.reason,
    email_id: row.emailId,
    subaccount_id: row.subaccountId,
    created_at: row.createdAt.toISOString(),
  };
}

/**
 * Adds an entry, or returns the existing one for the same address and scope unchanged (adding is
 * idempotent). The project is derived from the environment row, never from the caller.
 */
export async function addSuppression(
  env: SuppressionEnvironment,
  params: CreateSuppressionRequestOutput,
): Promise<{ suppression: SuppressionOutput; created: boolean } | null> {
  const projectId = await environmentProject(env);
  if (!projectId) return null;
  const [inserted] = await db
    .insert(emailSuppression)
    .values({
      organizationId: env.organizationId,
      projectId,
      environmentId: env.environmentId,
      subaccountId: env.subaccountId ?? null,
      address: params.address,
      scope: params.scope,
      reason: "manual",
    })
    .onConflictDoNothing({ target: ON_LIST })
    .returning();
  if (inserted) return { suppression: toSuppressionObject(inserted), created: true };
  const [existing] = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        inList(env),
        eq(emailSuppression.address, params.address),
        eq(emailSuppression.scope, params.scope),
      ),
    )
    .limit(1);
  // Removed again between the insert and the select: report it as created by this request.
  if (!existing) return addSuppression(env, params);
  return { suppression: toSuppressionObject(existing), created: false };
}

/** The environment's project, from the environment row; `null` if it is not in the organization. */
async function environmentProject(env: SuppressionEnvironment): Promise<string | null> {
  const [environment] = await db
    .select({ projectId: schema.environment.projectId })
    .from(schema.environment)
    .where(
      and(
        eq(schema.environment.id, env.environmentId),
        eq(schema.environment.organizationId, env.organizationId),
      ),
    )
    .limit(1);
  return environment?.projectId ?? null;
}

/**
 * One entry of a bulk import, before validation. `reason` and `createdAt` are for migrations from
 * another provider (`@coss/migrate`), which keep its reason and date; the API and CSV imports never
 * set them (reason `import`, created now).
 */
export type SuppressionImportEntry = {
  address: string;
  scope?: string | undefined;
  reason?: Exclude<SuppressionReason, "import"> | undefined;
  createdAt?: Date | undefined;
};

const IMPORT_INSERT_BATCH = 1000;

/**
 * Adds many entries with reason `import` (or the entry's own). Each entry is validated like a single add; invalid ones
 * are skipped and reported by index, entries already on the list (or repeated) count as `existing`.
 * All inserts run in one transaction. `null` when the environment is missing.
 */
export async function importSuppressions(
  env: SuppressionEnvironment,
  entries: SuppressionImportEntry[],
): Promise<SuppressionImportOutput | null> {
  const projectId = await environmentProject(env);
  if (!projectId) return null;
  const invalid: SuppressionImportOutput["invalid"] = [];
  const unique = new Map<
    string,
    CreateSuppressionRequestOutput & Pick<SuppressionImportEntry, "reason" | "createdAt">
  >();
  entries.forEach((entry, index) => {
    const parsed = CreateSuppressionRequest.safeParse({
      address: entry.address,
      scope: entry.scope,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0] === "scope" ? "scope" : "address";
      invalid.push({
        index,
        address: entry.address,
        message: `Invalid ${field}: ${issue?.message ?? "invalid value."}`,
      });
      return;
    }
    unique.set(`${parsed.data.scope} ${parsed.data.address}`, {
      ...parsed.data,
      reason: entry.reason,
      createdAt: entry.createdAt,
    });
  });
  const valid = [...unique.values()];
  let created = 0;
  await db.transaction(async (tx) => {
    for (let start = 0; start < valid.length; start += IMPORT_INSERT_BATCH) {
      const inserted = await tx
        .insert(emailSuppression)
        .values(
          valid.slice(start, start + IMPORT_INSERT_BATCH).map((entry) => ({
            organizationId: env.organizationId,
            projectId,
            environmentId: env.environmentId,
            subaccountId: env.subaccountId ?? null,
            address: entry.address,
            scope: entry.scope,
            reason: entry.reason ?? ("import" as const),
            ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
          })),
        )
        .onConflictDoNothing({ target: ON_LIST })
        .returning({ id: emailSuppression.id });
      created += inserted.length;
    }
  });
  return {
    object: "suppression_import",
    created,
    existing: entries.length - invalid.length - created,
    invalid,
  };
}

const EXPORT_PAGE_SIZE = 1000;

/** Every matching entry, oldest first, one page per iteration (keyset pagination, no snapshot). */
export async function* exportSuppressionPages(
  env: SuppressionEnvironment,
  filter: ExportSuppressionsQueryOutput = {},
): AsyncGenerator<SuppressionOutput[]> {
  let after: string | undefined;
  for (;;) {
    const rows = await db
      .select()
      .from(emailSuppression)
      .where(
        and(
          inList(env),
          filter.scope === undefined ? undefined : eq(emailSuppression.scope, filter.scope),
          filter.reason === undefined ? undefined : eq(emailSuppression.reason, filter.reason),
          after === undefined ? undefined : gt(emailSuppression.id, after),
        ),
      )
      .orderBy(asc(emailSuppression.id))
      .limit(EXPORT_PAGE_SIZE);
    if (rows.length > 0) yield rows.map(toSuppressionObject);
    if (rows.length < EXPORT_PAGE_SIZE) return;
    after = rows.at(-1)?.id;
  }
}

/** The environment's list as a CSV stream (header row first), read from the database page by page. */
export function suppressionsCsvStream(
  env: SuppressionEnvironment,
  filter: ExportSuppressionsQueryOutput = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pages = exportSuppressionPages(env, filter);
  let headerSent = false;
  return new ReadableStream({
    async pull(controller) {
      if (!headerSent) {
        headerSent = true;
        controller.enqueue(encoder.encode(suppressionCsvHeader()));
        return;
      }
      const next = await pages.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(next.value.map(suppressionCsvRow).join("")));
    },
    async cancel() {
      await pages.return(undefined);
    },
  });
}

/** Newest first, paginated by the `after` cursor (the last id of the previous page). */
export async function listSuppressions(
  env: SuppressionEnvironment,
  query: ListSuppressionsQueryOutput = {},
): Promise<SuppressionListOutput> {
  const limit = Math.min(query.limit ?? DEFAULT_SUPPRESSION_LIST_LIMIT, MAX_SUPPRESSION_LIST_LIMIT);
  if (query.after !== undefined && !isId("sup", query.after)) {
    return { object: "list", data: [], has_more: false };
  }
  const [cursor] = query.after
    ? await db
        .select({
          // Keep PostgreSQL's microseconds so the next page cannot skip same-millisecond rows.
          createdAt: sql<string>`${emailSuppression.createdAt}::text`,
          sequence: emailSuppression.sequence,
        })
        .from(emailSuppression)
        .where(and(inList(env), eq(emailSuppression.id, query.after)))
        .limit(1)
    : [];
  if (query.after && !cursor) return { object: "list", data: [], has_more: false };
  const rows = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        inList(env),
        query.address === undefined ? undefined : eq(emailSuppression.address, query.address),
        query.scope === undefined ? undefined : eq(emailSuppression.scope, query.scope),
        cursor
          ? or(
              lt(emailSuppression.createdAt, sql`${cursor.createdAt}::timestamptz`),
              and(
                eq(emailSuppression.createdAt, sql`${cursor.createdAt}::timestamptz`),
                lt(emailSuppression.sequence, cursor.sequence),
              ),
            )
          : undefined,
      ),
    )
    // Matches the (environment_id, created_at DESC NULLS LAST, sequence DESC NULLS LAST) index.
    .orderBy(
      sql`${emailSuppression.createdAt} desc nulls last`,
      sql`${emailSuppression.sequence} desc nulls last`,
    )
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toSuppressionObject),
    has_more: rows.length > limit,
  };
}

/** One entry of an environment. Malformed, unknown and foreign ids are all `null`. */
export async function getSuppression(
  env: SuppressionEnvironment,
  id: string,
): Promise<SuppressionOutput | null> {
  if (!isId("sup", id)) return null;
  const [row] = await db
    .select()
    .from(emailSuppression)
    .where(and(inEnvironment(env), eq(emailSuppression.id, id)))
    .limit(1);
  return row ? toSuppressionObject(row) : null;
}

/** Removes an entry; `false` when the environment has no entry with this id. */
export async function removeSuppression(env: SuppressionEnvironment, id: string): Promise<boolean> {
  if (!isId("sup", id)) return false;
  const deleted = await db
    .delete(emailSuppression)
    .where(and(inEnvironment(env), eq(emailSuppression.id, id)))
    .returning({ id: emailSuppression.id });
  return deleted.length > 0;
}

/**
 * Whether a send with `category` (for the list's sub-account, if any) would skip `address`, and
 * the entries that match.
 */
export async function checkSuppression(
  env: SuppressionEnvironment,
  query: CheckSuppressionQueryOutput,
): Promise<SuppressionCheckOutput> {
  const rows = await db
    .select()
    .from(emailSuppression)
    .where(
      and(
        inSendLists(env),
        eq(emailSuppression.address, query.address),
        inArray(emailSuppression.scope, matchingScopes(query.category, query.stream)),
      ),
    )
    .orderBy(desc(emailSuppression.createdAt), desc(emailSuppression.sequence));
  return {
    object: "suppression_check",
    address: query.address,
    suppressed: rows.length > 0,
    suppressions: rows.map(toSuppressionObject),
  };
}

/**
 * The matching entry of each suppressed address among `addresses` (bare, lower-cased) for an email
 * with `category` (sent for `env.subaccountId`, if any). A `*` entry wins over a category entry.
 */
export async function suppressedRecipients(
  tx: Executor,
  env: SuppressionEnvironment,
  addresses: string[],
  category: string | null,
  stream: EmailStream = "transactional",
): Promise<Map<string, SuppressionRow>> {
  const matches = new Map<string, SuppressionRow>();
  if (addresses.length === 0) return matches;
  const rows = await tx
    .select()
    .from(emailSuppression)
    .where(
      and(
        inSendLists(env),
        inArray(emailSuppression.address, addresses),
        inArray(emailSuppression.scope, matchingScopes(category, stream)),
      ),
    );
  for (const row of rows) {
    const current = matches.get(row.address);
    if (!current || row.scope === ALL_CATEGORIES) matches.set(row.address, row);
  }
  return matches;
}

/**
 * Adds an entry after a permanent bounce or a complaint (no-op if one exists): `*`, or
 * `stream:marketing` for a complaint about a marketing email (the recipient objected to marketing,
 * not to their password resets), or one for the email's category after a one-click unsubscribe.
 * Mailbox simulator addresses are never suppressed, like SES, so they keep working for tests.
 */
export async function autoSuppress(
  tx: Executor,
  input: {
    organizationId: string;
    projectId: string;
    environmentId: string;
    address: string;
    reason: Exclude<SuppressionReason, "manual">;
    emailId: string;
    /** The sub-account the email was sent for: the entry goes on its list. */
    subaccountId?: string | null;
    /** `*` unless given. */
    scope?: string;
  },
): Promise<void> {
  const address = input.address.toLowerCase();
  if (address.endsWith(`@${SIMULATOR_DOMAIN}`)) return;
  // A deleted sub-account's list went with it; late events about its emails add nothing.
  if (input.subaccountId) {
    const [list] = await tx
      .select({ id: schema.emailSubaccount.id })
      .from(schema.emailSubaccount)
      .where(
        and(
          eq(schema.emailSubaccount.id, input.subaccountId),
          eq(schema.emailSubaccount.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (!list) return;
  }
  await tx
    .insert(emailSuppression)
    .values({
      organizationId: input.organizationId,
      projectId: input.projectId,
      environmentId: input.environmentId,
      address,
      scope: input.scope ?? ALL_CATEGORIES,
      reason: input.reason,
      emailId: input.emailId,
      subaccountId: input.subaccountId ?? null,
    })
    .onConflictDoNothing({ target: ON_LIST });
}
