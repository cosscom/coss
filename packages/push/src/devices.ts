/**
 * The iOS app's push registrations: one per app session, so signing out, revoking the session,
 * a password reset or the session's expiry purge removes it with the session row.
 */
import { db, schema } from "@coss/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { type ApnsEnvironment, PUSH_CATEGORIES, type PushCategory } from "./schemas.ts";

const { pushDevice } = schema;

export type PushDeviceRow = typeof pushDevice.$inferSelect;

/**
 * Registers (or refreshes) the session's device. Any other registration of the same token is
 * removed: the phone was signed in again, or handed to someone else. Categories are kept on a
 * refresh unless given.
 */
export async function registerPushDevice(input: {
  userId: string;
  sessionId: string;
  token: string;
  apnsEnvironment: ApnsEnvironment;
  categories?: readonly PushCategory[];
}): Promise<PushDeviceRow> {
  return db.transaction(async (tx) => {
    // Serializes concurrent sign-ins on the same phone; the token's unique index backs it up.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`push:${input.token}`}, 0))`,
    );
    await tx
      .delete(pushDevice)
      .where(and(eq(pushDevice.token, input.token), ne(pushDevice.sessionId, input.sessionId)));
    const [row] = await tx
      .insert(pushDevice)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        token: input.token,
        apnsEnvironment: input.apnsEnvironment,
        categories: [...(input.categories ?? PUSH_CATEGORIES)],
      })
      .onConflictDoUpdate({
        target: pushDevice.sessionId,
        set: {
          userId: input.userId,
          token: input.token,
          apnsEnvironment: input.apnsEnvironment,
          categories: input.categories ? [...input.categories] : sql`${pushDevice.categories}`,
        },
      })
      .returning();
    if (!row) throw new Error("Registering the push device returned no row.");
    return row;
  });
}

export async function getPushDevice(sessionId: string): Promise<PushDeviceRow | null> {
  const [row] = await db.select().from(pushDevice).where(eq(pushDevice.sessionId, sessionId));
  return row ?? null;
}

/** Changes the session's categories; null when the session has no registration. */
export async function updatePushCategories(
  sessionId: string,
  categories: readonly PushCategory[],
): Promise<PushDeviceRow | null> {
  const [row] = await db
    .update(pushDevice)
    .set({ categories: [...categories] })
    .where(eq(pushDevice.sessionId, sessionId))
    .returning();
  return row ?? null;
}

export async function unregisterPushDevice(sessionId: string): Promise<void> {
  await db.delete(pushDevice).where(eq(pushDevice.sessionId, sessionId));
}

/** APNs said the token is no longer valid. Only deletes it if it wasn't re-registered meanwhile. */
export async function forgetPushDevice(deviceId: string, token: string): Promise<void> {
  await db.delete(pushDevice).where(and(eq(pushDevice.id, deviceId), eq(pushDevice.token, token)));
}
