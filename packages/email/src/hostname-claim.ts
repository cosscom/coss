import { db, schema, type Transaction } from "@coss/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { DomainError } from "./errors.ts";

/** Serialize MX/CNAME claims across both tables, including restarting failed tracking domains. */
export function claimEmailHostname<T>(
  hostname: string,
  kind: "tracking" | "receiving",
  claim: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${hostname}, 0))`);
    const conflict =
      kind === "tracking"
        ? await tx
            .select({ id: schema.receivingDomain.id })
            .from(schema.receivingDomain)
            .where(eq(schema.receivingDomain.hostname, hostname))
            .limit(1)
        : await tx
            .select({ id: schema.trackingDomain.id })
            .from(schema.trackingDomain)
            .where(
              and(
                eq(schema.trackingDomain.hostname, hostname),
                ne(schema.trackingDomain.status, "failed"),
              ),
            )
            .limit(1);
    if (conflict.length > 0) {
      throw new DomainError(
        kind === "tracking" ? "invalid_tracking_hostname" : "invalid_receiving_hostname",
        `${hostname} is already used for ${kind === "tracking" ? "receiving" : "tracking"}; choose another hostname.`,
      );
    }
    return claim(tx);
  });
}
