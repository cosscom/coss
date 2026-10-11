/** Screening history for platform admins. */
import { db, schema } from "@coss/db";
import { and, desc, eq } from "drizzle-orm";
import type { ContentScreeningRow, ScreeningVerdict } from "./screen.ts";

const { contentScreening } = schema;

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
