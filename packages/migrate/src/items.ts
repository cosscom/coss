/**
 * `migration_item` rows: one per object an import handles. An item is written `pending`, with the
 * name it will get, before the object is created, so a retry (a lost lease, a crash) finds it and
 * resolves it by that name instead of creating a second object.
 */
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import type { MigrationItemRow, MigrationRow } from "./migrations.ts";

const { migrationItem } = schema;

export type ItemKind = MigrationItemRow["kind"];

export type ItemResult = {
  outcome: "created" | "existing" | "skipped" | "failed";
  targetId?: string | null | undefined;
  targetName?: string | null | undefined;
  message?: string | null | undefined;
  warnings?: string[] | undefined;
  needsReview?: boolean | undefined;
};

/** Every item of a kind this import has recorded. */
export async function itemsOf(
  row: Pick<MigrationRow, "id" | "organizationId">,
  kind: ItemKind,
): Promise<MigrationItemRow[]> {
  return db
    .select()
    .from(migrationItem)
    .where(
      and(
        eq(migrationItem.organizationId, row.organizationId),
        eq(migrationItem.migrationId, row.id),
        eq(migrationItem.kind, kind),
      ),
    );
}

/**
 * The item for a source object: recorded now (`pending`, named by `name()`), or found from an
 * earlier attempt, pending or already finished.
 */
export async function claimItem(
  row: Pick<MigrationRow, "id" | "organizationId">,
  kind: ItemKind,
  source: { id: string; name: string },
  name: () => string | null,
): Promise<MigrationItemRow> {
  // Looked up first: `name()` reserves a name, which an item that already has one must not do.
  const recorded = await findItem(row, kind, source.id);
  if (recorded) return recorded;
  const [inserted] = await db
    .insert(migrationItem)
    .values({
      migrationId: row.id,
      organizationId: row.organizationId,
      kind,
      sourceId: source.id,
      sourceName: source.name.slice(0, 500),
      targetName: name(),
    })
    .onConflictDoNothing({
      target: [migrationItem.migrationId, migrationItem.kind, migrationItem.sourceId],
    })
    .returning();
  if (inserted) return inserted;
  // Recorded meanwhile by another attempt.
  const existing = await findItem(row, kind, source.id);
  if (!existing) throw new Error(`Migration item ${kind} ${source.id} vanished.`);
  return existing;
}

async function findItem(
  row: Pick<MigrationRow, "id" | "organizationId">,
  kind: ItemKind,
  sourceId: string,
): Promise<MigrationItemRow | undefined> {
  const [existing] = await db
    .select()
    .from(migrationItem)
    .where(
      and(
        eq(migrationItem.organizationId, row.organizationId),
        eq(migrationItem.migrationId, row.id),
        eq(migrationItem.kind, kind),
        eq(migrationItem.sourceId, sourceId),
      ),
    )
    .limit(1);
  return existing;
}

/**
 * Records the object a pending item just created, before anything else happens to it: a retry
 * then knows the object is this import's own and finishes it (a template's publication).
 */
export async function recordTarget(item: MigrationItemRow, targetId: string): Promise<void> {
  await db
    .update(migrationItem)
    .set({ targetId })
    .where(
      and(eq(migrationItem.id, item.id), eq(migrationItem.organizationId, item.organizationId)),
    );
}

export async function finishItem(item: MigrationItemRow, result: ItemResult): Promise<void> {
  await db
    .update(migrationItem)
    .set({
      outcome: result.outcome,
      targetId: result.targetId ?? null,
      targetName: result.targetName ?? item.targetName,
      message: result.message?.slice(0, 1000) ?? null,
      warnings: result.warnings ?? [],
      needsReview: result.needsReview ?? false,
    })
    .where(
      and(eq(migrationItem.id, item.id), eq(migrationItem.organizationId, item.organizationId)),
    );
}
