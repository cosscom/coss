/** Platform admin audit entries for billing changes, written in the change's transaction. */
import { type Executor, schema } from "@coss/db";

/** The same shape as `@coss/tenancy/admin`'s actor (billing can't import tenancy). */
export type AdminActor = { userId: string; email: string };

export type BillingAdminAction =
  | "billing.account_updated"
  | "billing.contract_created"
  | "billing.contract_canceled"
  | "billing.credit_granted"
  | "billing.credit_voided"
  | "billing.invoice_created"
  | "billing.invoice_voided"
  | "billing.invoice_paid"
  | "billing.invoice_uncollectible"
  | "billing.invoice_resynced"
  | "billing.credit_note_created"
  | "billing.hold_placed"
  | "billing.hold_lifted";

export async function auditBillingChange(
  executor: Executor,
  input: {
    actor: AdminActor;
    action: BillingAdminAction;
    organizationId: string;
    reason: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await executor.insert(schema.adminAuditEvent).values({
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    action: input.action,
    targetType: "organization",
    targetId: input.organizationId,
    organizationId: input.organizationId,
    reason: input.reason,
    metadata: input.metadata ?? {},
  });
}
