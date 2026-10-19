/**
 * Domains are imported by the dashboard when an import starts, not by the worker: creating one
 * creates its SES identity (and the organization's tenants), which only the dashboard's IAM policy
 * allows. Domains belong to the organization, so they serve every environment.
 */
import { createDomain, type DomainDeps, DomainError, listDomains } from "@coss/email";
import { claimItem, finishItem, type ItemResult } from "./items.ts";
import { inventoryOf, type MigrationRow } from "./migrations.ts";

export type DomainImport = { name: string; result: ItemResult };

/** Creates the chosen domains (of the import's inventory) and records each as an item. */
export async function importDomains(
  row: MigrationRow,
  domainIds: string[],
  input: { userId: string | null },
  deps: DomainDeps,
): Promise<DomainImport[]> {
  const chosen = new Set(domainIds);
  const sources = (inventoryOf(row)?.domains ?? []).filter((domain) => chosen.has(domain.id));
  const results: DomainImport[] = [];
  for (const source of sources) {
    const item = await claimItem(row, "domain", source, () => source.name);
    if (!item) continue;
    const existing = (await listDomains({ organizationId: row.organizationId })).find(
      (domain) => domain.name === source.name && domain.status !== "failed",
    );
    let result: ItemResult;
    if (existing) {
      result = { outcome: "existing", targetId: existing.id };
    } else {
      try {
        const created = await createDomain(
          { organizationId: row.organizationId, name: source.name, userId: input.userId },
          deps,
        );
        result = {
          outcome: "created",
          targetId: created.id,
          needsReview: true,
          message: "Add its DNS records to verify it.",
        };
      } catch (error) {
        if (!(error instanceof DomainError) && !isPlanLimit(error)) throw error;
        result = {
          outcome:
            error instanceof DomainError && error.code === "domain_taken" ? "skipped" : "failed",
          message: (error as Error).message,
        };
      }
    }
    await finishItem(item, result);
    results.push({ name: source.name, result });
  }
  return results;
}

function isPlanLimit(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "plan_limit_reached";
}
