import { db, schema } from "@coss/db";
import { sql } from "drizzle-orm";
import { TenancyError } from "./errors.ts";

/**
 * Grants the Better Auth platform `admin` role (dashboard /admin). Used by the seed and the
 * `admin:create` script; the user must already exist.
 */
export async function promoteToAdmin(email: string): Promise<{ id: string; email: string }> {
  const { user } = schema;
  const [row] = await db
    .update(user)
    .set({ role: "admin" })
    .where(sql`lower(${user.email}) = lower(${email.trim()})`)
    .returning({ id: user.id, email: user.email });
  if (!row) throw new TenancyError("not_found", `No user with email "${email}".`);
  return row;
}
