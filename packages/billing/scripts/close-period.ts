/**
 * Development only: closes billing months as if it were `--at` (default: now), e.g. to see the
 * invoice for this month before it ends. The worker then pushes and collects the invoices.
 *
 *   bun run billing:close-period --org acme --at 2026-11-01T00:20:00Z
 */
import { parseArgs } from "node:util";
import { closeDb, db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { runDueBillingPeriods } from "../src/periods.ts";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to move billing time in production.");
  process.exit(1);
}
const { values } = parseArgs({
  options: { org: { type: "string" }, at: { type: "string" } },
});
if (!values.org) {
  console.error("Usage: billing:close-period --org <slug> [--at <ISO time>]");
  process.exit(1);
}
const [org] = await db
  .select({ id: schema.organization.id })
  .from(schema.organization)
  .where(eq(schema.organization.slug, values.org));
if (!org) {
  console.error(`No organization "${values.org}".`);
  process.exit(1);
}
const now = values.at ? new Date(values.at) : new Date();
const closed = await runDueBillingPeriods({ now, scope: { organizationIds: [org.id] } });
console.info(`Closed ${closed} billing month(s) for ${values.org} as of ${now.toISOString()}.`);
await closeDb();
