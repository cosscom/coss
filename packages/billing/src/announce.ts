/**
 * `billing.*` webhook events. Billing is organization-wide, so each event goes to the endpoints of
 * every live environment (like `account.*`), queued in the transaction that decided it.
 */
import { type Executor, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, eq } from "drizzle-orm";
import type { PlanKey } from "./catalog/plans.ts";
import type { StoredBillingWebhookEvent } from "./wire.ts";

const { environment } = schema;

type Announcement = StoredBillingWebhookEvent extends infer E
  ? E extends { type: infer T; data: infer D }
    ? { type: T; data: Omit<D, "organization_id" | "occurred_at"> }
    : never
  : never;

export async function announce(
  tx: Executor,
  organizationId: string,
  event: Announcement,
  now: Date = new Date(),
): Promise<void> {
  const environments = await tx
    .select({ id: environment.id })
    .from(environment)
    .where(and(eq(environment.organizationId, organizationId), eq(environment.mode, "live")));
  for (const { id: environmentId } of environments) {
    const id = newId(ID_PREFIXES.webhookEvent);
    const payload = {
      id,
      object: "event",
      type: event.type,
      created_at: now.toISOString(),
      data: { organization_id: organizationId, occurred_at: now.toISOString(), ...event.data },
    } as StoredBillingWebhookEvent;
    await enqueueWebhookMessage(tx, {
      id,
      organizationId,
      environmentId,
      type: event.type,
      payload: payload as unknown as Record<string, unknown>,
      now,
    });
  }
}

/** `billing.plan_changed`: what applies from `effectiveAt` (now or scheduled). */
export async function announcePlanChange(
  tx: Executor,
  organizationId: string,
  change: {
    change: "upgrade" | "downgrade" | "cancellation" | "reverted" | "contract";
    plan: PlanKey;
    previousPlan: PlanKey;
    effectiveAt: Date;
  },
  now: Date = new Date(),
): Promise<void> {
  await announce(
    tx,
    organizationId,
    {
      type: "billing.plan_changed",
      data: {
        change: change.change,
        plan: change.plan,
        previous_plan: change.previousPlan,
        effective_at: change.effectiveAt.toISOString(),
      },
    },
    now,
  );
}
