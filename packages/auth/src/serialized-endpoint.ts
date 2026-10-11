import type { GenericEndpointContext } from "@better-auth/core";
import { runWithTransaction } from "@better-auth/core/context";
import { db, type Transaction } from "@coss/db";
import * as schema from "@coss/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sql } from "drizzle-orm";

/** Hold a cross-process lock until the endpoint's writes commit (or roll back on failure). */
export function serializedEndpoint<E extends (ctx: never) => Promise<unknown>>(
  endpoint: E,
  key: (ctx: GenericEndpointContext) => Promise<string | null>,
  check?: (ctx: GenericEndpointContext, tx: Transaction) => Promise<void>,
): E {
  return Object.assign(async (ctx: GenericEndpointContext) => {
    const lockKey = await key(ctx);
    if (lockKey === null) return endpoint(ctx as never);
    const adapter = drizzleAdapter(db, { provider: "pg", schema, transaction: true })(
      ctx.context.options,
    );
    // runWithTransaction routes all Better Auth writes through the locked transaction and
    // defers its after hooks until commit. Nested Better Auth transactions reuse this one.
    adapter.transaction = (run) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
        if (check) await check(ctx, tx);
        return run(
          drizzleAdapter(tx, { provider: "pg", schema, transaction: true })(ctx.context.options),
        );
      });
    return runWithTransaction(adapter, () => endpoint(ctx as never));
  }, endpoint) as E;
}
