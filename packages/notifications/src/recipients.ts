import { db, schema } from "@coss/db";
import { and, asc, eq, isNull, ne, or, sql } from "drizzle-orm";
import type { NotificationRecipient } from "./outbox.ts";

const { member, user } = schema;

/**
 * The organization's members in any of `roles` (default owners and admins), oldest first.
 * Verified, unbanned addresses only: anyone can sign up with someone else's address.
 */
export async function organizationAdmins(
  organizationId: string,
  roles: readonly string[] = ["owner", "admin"],
): Promise<NotificationRecipient[]> {
  return db
    .select({ userId: user.id, email: user.email })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, organizationId),
        sql`string_to_array(${member.role}, ',') && ARRAY[${sql.join(
          roles.map((role) => sql`${role}`),
          sql`, `,
        )}]::text[]`,
        eq(user.emailVerified, true),
        or(isNull(user.banned), ne(user.banned, true)),
      ),
    )
    .orderBy(asc(member.createdAt));
}
