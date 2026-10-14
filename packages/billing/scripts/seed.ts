/**
 * Billing demo data, after `@coss/tenancy`'s seed: the demo organization (`acme`) on Scale from
 * the start of the month. Idempotent. Refuses to run in production.
 */
import { closeDb, db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { lockBillingAccount } from "../src/accounts.ts";
import { contractAt, insertContract } from "../src/contracts.ts";
import { selfServeTerms } from "../src/schemas.ts";
import { periodOf } from "../src/time.ts";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed billing data in production.");
  process.exit(1);
}

const [org] = await db
  .select({ id: schema.organization.id })
  .from(schema.organization)
  .where(eq(schema.organization.slug, "acme"));
if (!org) {
  console.error("No `acme` organization: run the tenancy seed first.");
  process.exit(1);
}
const now = new Date();
await db.transaction(async (tx) => {
  const account = await lockBillingAccount(tx, org.id, "fake");
  if (await contractAt(org.id, now, tx)) {
    console.info("acme already has a contract.");
    return;
  }
  await insertContract(
    tx,
    {
      organizationId: org.id,
      accountId: account.id,
      kind: "self_serve",
      status: "confirmed",
      terms: selfServeTerms("scale"),
      effectiveFrom: periodOf(now).start,
      note: "Seeded",
    },
    now,
  );
  console.info("acme is on the Scale plan (fake provider).");
});
await closeDb();
