/**
 * Organization deletion. Requesting it locks everyone out at once, in one transaction: the
 * organization loses its members, invitations, API keys and SSO provider (with the accounts linked
 * to it), so no dashboard page, Better Auth endpoint or API request reaches it any more. The
 * worker then releases its provider resources, deletes its data in batches and finally the
 * organization row (`runDueOrganizationDeletions`); its slug is free after that.
 *
 * Imports only `@coss/db`, so the worker can use it without loading Better Auth.
 */
import { db, type Executor, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, lte, type SQL, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { TenancyError } from "./errors.ts";

const {
  account,
  apikey,
  contentScreening,
  email,
  emailBatch,
  emailSuppression,
  environment,
  invitation,
  member,
  organization,
  organizationDeletion,
  organizationSuspension,
  session,
  ssoProvider,
  webhookEndpoint,
  webhookMessage,
} = schema;

export type OrganizationDeletion = typeof organizationDeletion.$inferSelect;

/**
 * Removes every way into the organization: API keys (they have no FK to it), the SSO provider with
 * the accounts linked to it (as Better Auth's delete-provider does) and the sessions it created,
 * invitations and members.
 * Idempotent; the worker repeats it before deleting the organization, in case a request that
 * started before the deletion (an invitation being accepted, an SSO sign-in) added something.
 */
export async function revokeOrganizationAccess(
  organizationId: string,
  executor: Executor = db,
): Promise<void> {
  await executor.delete(apikey).where(eq(apikey.referenceId, organizationId));
  const providers = await executor
    .delete(ssoProvider)
    .where(eq(ssoProvider.organizationId, organizationId))
    .returning({ providerId: ssoProvider.providerId });
  if (providers.length > 0) {
    const providerIds = providers.map((row) => row.providerId);
    await executor.delete(account).where(inArray(account.providerId, providerIds));
    // Sessions the IdP created (`revokeSsoProviderSessions`, not imported: it loads Better Auth).
    await executor.delete(session).where(inArray(session.ssoProviderId, providerIds));
  }
  await executor.delete(invitation).where(eq(invitation.organizationId, organizationId));
  await executor.delete(member).where(eq(member.organizationId, organizationId));
  // Better Auth's active organization is never relied on, but don't leave it pointing here.
  await executor
    .update(session)
    .set({ activeOrganizationId: null })
    .where(eq(session.activeOrganizationId, organizationId));
}

/**
 * Starts deleting an organization (see the module comment); there is no undo. A suspended
 * organization can only be deleted by a platform admin, so its domains and history stay put
 * while it is under review. Pass `executor` to commit it with an audit entry.
 */
export async function requestOrganizationDeletion(
  input: {
    organizationId: string;
    actor: { userId: string; email: string };
    byPlatformAdmin?: boolean;
  },
  executor?: Executor,
): Promise<OrganizationDeletion> {
  const run = async (tx: Executor) => {
    // Serializes with renames and with a concurrent request for the same organization.
    const [org] = await tx
      .select({ id: organization.id, name: organization.name, slug: organization.slug })
      .from(organization)
      .where(eq(organization.id, input.organizationId))
      .for("update")
      .limit(1);
    if (!org) throw new TenancyError("not_found", "Organization not found.");
    if (!input.byPlatformAdmin) {
      const [suspension] = await tx
        .select({ id: organizationSuspension.organizationId })
        .from(organizationSuspension)
        .where(eq(organizationSuspension.organizationId, org.id))
        .limit(1);
      if (suspension) {
        throw new TenancyError("forbidden", "A suspended organization can't be deleted.");
      }
    }
    const [deletion] = await tx
      .insert(organizationDeletion)
      .values({
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        requestedByUserId: input.actor.userId,
        requestedByEmail: input.actor.email,
        byPlatformAdmin: input.byPlatformAdmin ?? false,
      })
      .onConflictDoNothing({ target: organizationDeletion.organizationId })
      .returning();
    if (!deletion) {
      throw new TenancyError("conflict", "This organization is already being deleted.");
    }
    await revokeOrganizationAccess(org.id, tx);
    return deletion;
  };
  return executor ? run(executor) : db.transaction(run);
}

/** The organization's deletion request (pending or completed), or `null`. */
export async function getOrganizationDeletion(
  organizationId: string,
): Promise<OrganizationDeletion | null> {
  const [row] = await db
    .select()
    .from(organizationDeletion)
    .where(eq(organizationDeletion.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

/** Whether a deletion of the organization is pending (Better Auth hooks, SSO sign-in). */
export async function isOrganizationBeingDeleted(
  organizationId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ id: organizationDeletion.id })
    .from(organizationDeletion)
    .where(
      and(
        eq(organizationDeletion.organizationId, organizationId),
        eq(organizationDeletion.status, "pending"),
      ),
    )
    .limit(1);
  return row !== undefined;
}

// --- Teardown (worker) ------------------------------------------------------------------------

/** Rows deleted per statement, so no single statement holds locks on a whole table for long. */
export const DELETION_BATCH_SIZE = 1000;
/** A claim's lease, renewed between batches; an expired one is taken over by another worker. */
export const DELETION_LEASE_MS = 10 * 60_000;
const MAX_BACKOFF_MS = 60 * 60_000;
const ERROR_MAX_LENGTH = 1000;

export type OrganizationTeardownDeps = {
  /**
   * Releases what the organization holds at providers (email: its domain identities and SES
   * tenant, `releaseOrganizationEmailResources`) and stops its sends first. Runs before any data
   * is deleted and on every retry, so it must be idempotent.
   */
  releaseProviderResources: (organizationId: string) => Promise<void>;
};

type Claimed = typeof organizationDeletion.$inferSelect;

async function claimDue(
  now: Date,
  limit: number,
  scope?: { organizationIds: string[] },
): Promise<Claimed[]> {
  const due = db
    .select({ id: organizationDeletion.id })
    .from(organizationDeletion)
    .where(
      and(
        eq(organizationDeletion.status, "pending"),
        isNotNull(organizationDeletion.nextAttemptAt),
        lte(organizationDeletion.nextAttemptAt, now),
        scope ? inArray(organizationDeletion.organizationId, scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(organizationDeletion.nextAttemptAt))
    .limit(limit)
    .for("update", { skipLocked: true });
  return db
    .update(organizationDeletion)
    .set({
      nextAttemptAt: new Date(now.getTime() + DELETION_LEASE_MS),
      attemptCount: sql`${organizationDeletion.attemptCount} + 1`,
    })
    .where(inArray(organizationDeletion.id, due))
    .returning();
}

async function renewLease(id: string): Promise<void> {
  await db
    .update(organizationDeletion)
    .set({ nextAttemptAt: new Date(Date.now() + DELETION_LEASE_MS) })
    .where(and(eq(organizationDeletion.id, id), eq(organizationDeletion.status, "pending")));
}

/**
 * Deletes the rows of `table` matching `where`, `batchSize` at a time (their children go by FK
 * cascade). Returns false when `signal` aborted before it finished.
 */
async function deleteInBatches(
  table: PgTable,
  id: PgColumn,
  where: SQL | undefined,
  batchSize: number,
  signal: AbortSignal | undefined,
): Promise<boolean> {
  for (;;) {
    if (signal?.aborted) return false;
    const batch = db.select({ id }).from(table).where(where).limit(batchSize);
    const deleted = await db.delete(table).where(inArray(id, batch)).returning({ id });
    if (deleted.length < batchSize) return true;
  }
}

/**
 * Deletes the organization's bulky data (emails with their recipients, events, attachments and
 * links; webhook messages with their deliveries; suppressions; screenings) in batches, one
 * environment at a time, along indexed columns. Everything else is small and goes with the
 * organization row. Returns false when `signal` aborted first.
 */
async function deleteOrganizationData(
  deletion: Claimed,
  batchSize: number,
  signal: AbortSignal | undefined,
): Promise<boolean> {
  const organizationId = deletion.organizationId;
  const environments = await db
    .select({ id: environment.id })
    .from(environment)
    .where(eq(environment.organizationId, organizationId));
  for (const { id: environmentId } of environments) {
    const steps: [PgTable, PgColumn, SQL | undefined][] = [
      [
        email,
        email.id,
        and(eq(email.environmentId, environmentId), eq(email.organizationId, organizationId)),
      ],
      [
        emailBatch,
        emailBatch.id,
        and(
          eq(emailBatch.environmentId, environmentId),
          eq(emailBatch.organizationId, organizationId),
        ),
      ],
      [
        webhookMessage,
        webhookMessage.id,
        and(
          eq(webhookMessage.environmentId, environmentId),
          eq(webhookMessage.organizationId, organizationId),
        ),
      ],
      [
        webhookEndpoint,
        webhookEndpoint.id,
        and(
          eq(webhookEndpoint.environmentId, environmentId),
          eq(webhookEndpoint.organizationId, organizationId),
        ),
      ],
      [
        emailSuppression,
        emailSuppression.id,
        and(
          eq(emailSuppression.environmentId, environmentId),
          eq(emailSuppression.organizationId, organizationId),
        ),
      ],
    ];
    for (const [table, id, where] of steps) {
      if (!(await deleteInBatches(table, id, where, batchSize, signal))) return false;
    }
    await renewLease(deletion.id);
  }
  return deleteInBatches(
    contentScreening,
    contentScreening.id,
    eq(contentScreening.organizationId, organizationId),
    batchSize,
    signal,
  );
}

async function tearDown(
  deletion: Claimed,
  deps: OrganizationTeardownDeps,
  batchSize: number,
  signal: AbortSignal | undefined,
): Promise<boolean> {
  const organizationId = deletion.organizationId;
  // Again, in case a request that started before the deletion let someone back in.
  await revokeOrganizationAccess(organizationId);
  await deps.releaseProviderResources(organizationId);
  if (!(await deleteOrganizationData(deletion, batchSize, signal))) return false;
  await db.transaction(async (tx) => {
    await revokeOrganizationAccess(organizationId, tx);
    // Cascades to everything left: projects, environments, domains, tenant, standing, history…
    await tx.delete(organization).where(eq(organization.id, organizationId));
    await tx
      .update(organizationDeletion)
      .set({ status: "completed", completedAt: new Date(), nextAttemptAt: null, lastError: null })
      .where(eq(organizationDeletion.id, deletion.id));
  });
  return true;
}

/**
 * System-level (worker): carries out pending organization deletions. Each is leased first, so
 * concurrent workers don't run the same one; a failure is recorded and retried with backoff (1,
 * 2, 4… minutes, at most hourly) until it succeeds. Once `signal` aborts (shutdown), a teardown
 * stops between batches and is picked up again right away by the next run. `scope` limits the
 * scan to some organizations (tests). Returns how many deletions it claimed.
 */
export async function runDueOrganizationDeletions(
  opts: {
    limit?: number;
    now?: Date;
    batchSize?: number;
    signal?: AbortSignal;
    scope?: { organizationIds: string[] };
  },
  deps: OrganizationTeardownDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const claimed = await claimDue(now, opts.limit ?? 5, opts.scope);
  for (const deletion of claimed) {
    try {
      if (
        opts.signal?.aborted ||
        !(await tearDown(deletion, deps, opts.batchSize ?? DELETION_BATCH_SIZE, opts.signal))
      ) {
        await db
          .update(organizationDeletion)
          .set({ nextAttemptAt: new Date() })
          .where(eq(organizationDeletion.id, deletion.id));
      }
    } catch (error) {
      console.error(
        `[tenancy:deletion] deleting organization ${deletion.organizationId} failed:`,
        error,
      );
      const backoff = Math.min(60_000 * 2 ** (deletion.attemptCount - 1), MAX_BACKOFF_MS);
      const message = error instanceof Error ? error.message : String(error);
      await db
        .update(organizationDeletion)
        .set({
          nextAttemptAt: new Date(Date.now() + backoff),
          lastError: message.slice(0, ERROR_MAX_LENGTH) || "Teardown failed.",
        })
        .where(eq(organizationDeletion.id, deletion.id));
    }
  }
  return claimed.length;
}
