import { db, schema } from "@coss/db";
import { eq, sql } from "drizzle-orm";
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

/**
 * Platform-admin recovery for a user who lost their authenticator and backup codes: removes
 * their TOTP secret and turns two-factor off. Their passkeys and sessions are left alone; any
 * organization that requires two-factor sends them to set it up again on their next visit.
 */
export async function resetUserTwoFactor(input: { userId: string }): Promise<boolean> {
  const { twoFactor, user } = schema;
  return db.transaction(async (tx) => {
    await tx.delete(twoFactor).where(eq(twoFactor.userId, input.userId));
    const updated = await tx
      .update(user)
      .set({ twoFactorEnabled: false })
      .where(eq(user.id, input.userId))
      .returning({ id: user.id });
    return updated.length > 0;
  });
}
