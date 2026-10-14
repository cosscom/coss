/**
 * Organizations whose deliveries are held: suspended ones (they resume once it is lifted) and ones
 * being deleted (the worker deletes their data shortly; nothing more goes out to them).
 */
import { db, schema } from "@coss/db";
import { and, eq, notExists, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

const { organizationDeletion, organizationSuspension } = schema;

/** A condition matching rows whose organization (`organizationId` column) is neither suspended nor being deleted. */
export function organizationNotHeld(organizationId: AnyPgColumn) {
  return and(
    notExists(
      db
        .select({ one: sql`1` })
        .from(organizationSuspension)
        .where(eq(organizationSuspension.organizationId, organizationId)),
    ),
    notExists(
      db
        .select({ one: sql`1` })
        .from(organizationDeletion)
        .where(
          and(
            eq(organizationDeletion.organizationId, organizationId),
            eq(organizationDeletion.status, "pending"),
          ),
        ),
    ),
  );
}
