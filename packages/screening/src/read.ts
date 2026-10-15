/** Screening history for platform admins. */
import { db, schema } from "@coss/db";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { ContentScreeningRow, ScreeningVerdict } from "./screen.ts";

const { contentScreening, organization } = schema;

/** The organization's latest screenings, newest first. */
export async function listScreenings(
  organizationId: string,
  opts: { limit?: number; verdict?: ScreeningVerdict } = {},
): Promise<ContentScreeningRow[]> {
  return db
    .select()
    .from(contentScreening)
    .where(
      and(
        eq(contentScreening.organizationId, organizationId),
        opts.verdict ? eq(contentScreening.verdict, opts.verdict) : undefined,
      ),
    )
    .orderBy(desc(contentScreening.createdAt), desc(contentScreening.id))
    .limit(opts.limit ?? 50);
}

export type AdminScreeningRow = ContentScreeningRow & {
  organizationName: string;
  organizationSlug: string;
};

/**
 * Screenings of every organization, newest first (`before`: an id of the previous page's last
 * row), with each organization's name. Platform-level: call only after `requirePlatformAdmin*`.
 */
export async function listScreeningsForAdmin(
  opts: {
    verdicts?: ScreeningVerdict[];
    /** One message's screenings. */
    subject?: { product: string; id: string };
    before?: string;
    limit?: number;
    scope?: { organizationIds?: string[] };
  } = {},
): Promise<{ items: AdminScreeningRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const rows = await db
    .select({
      screening: contentScreening,
      organizationName: organization.name,
      organizationSlug: organization.slug,
    })
    .from(contentScreening)
    .innerJoin(organization, eq(organization.id, contentScreening.organizationId))
    .where(
      and(
        opts.verdicts && opts.verdicts.length > 0
          ? inArray(contentScreening.verdict, opts.verdicts)
          : undefined,
        opts.subject
          ? and(
              eq(contentScreening.product, opts.subject.product),
              eq(contentScreening.subjectId, opts.subject.id),
            )
          : undefined,
        opts.before
          ? sql`(${contentScreening.createdAt}, ${contentScreening.id}) < (select c.created_at, c.id from ${contentScreening} c where c.id = ${opts.before})`
          : undefined,
        opts.scope?.organizationIds
          ? inArray(contentScreening.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(desc(contentScreening.createdAt), desc(contentScreening.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map((row) => ({
    ...row.screening,
    organizationName: row.organizationName,
    organizationSlug: row.organizationSlug,
  }));
  return { items: page, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
}

/** Screenings of every organization in `[since, now)` by verdict. Platform-level, like the above. */
export async function countScreeningsForAdmin(input: {
  since: Date;
  now?: Date;
  scope?: { organizationIds?: string[] };
}): Promise<Record<ScreeningVerdict, number>> {
  const rows = await db
    .select({ verdict: contentScreening.verdict, count: sql<number>`count(*)::int` })
    .from(contentScreening)
    .where(
      and(
        gte(contentScreening.createdAt, input.since),
        lt(contentScreening.createdAt, input.now ?? new Date()),
        input.scope?.organizationIds
          ? inArray(contentScreening.organizationId, input.scope.organizationIds)
          : undefined,
      ),
    )
    .groupBy(contentScreening.verdict);
  const counts: Record<ScreeningVerdict, number> = { clean: 0, flagged: 0, blocked: 0, error: 0 };
  for (const row of rows) counts[row.verdict] = row.count;
  return counts;
}
