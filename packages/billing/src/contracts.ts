/**
 * Contracts: what an organization pays. A confirmed contract is in effect while
 * `effective_from <= t < effective_until`; none in effect means the Free plan. Every change runs
 * under the account lock (`lockBillingAccount`), which is what keeps contracts from overlapping.
 */
import { db, type Executor, schema, type Transaction } from "@coss/db";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { stringifyWithBigInt } from "./money.ts";
import { type ContractTerms, parseContractTerms } from "./schemas.ts";
import type { Interval } from "./time.ts";

const { billingContract } = schema;

export type ContractRow = typeof billingContract.$inferSelect;
export type Contract = Omit<ContractRow, "terms"> & { terms: ContractTerms };

export function toContract(row: ContractRow): Contract {
  return { ...row, terms: parseContractTerms(row.terms) };
}

/** Terms as stored in jsonb (bigints as decimal strings). */
export function storedTerms(terms: ContractTerms): Record<string, unknown> {
  return JSON.parse(stringifyWithBigInt(terms));
}

function inEffectAt(at: Date) {
  return and(
    eq(billingContract.status, "confirmed"),
    lte(billingContract.effectiveFrom, at),
    or(isNull(billingContract.effectiveUntil), gt(billingContract.effectiveUntil, at)),
  );
}

export async function contractAt(
  organizationId: string,
  at: Date,
  executor: Executor = db,
): Promise<Contract | null> {
  const [row] = await executor
    .select()
    .from(billingContract)
    .where(and(eq(billingContract.organizationId, organizationId), inEffectAt(at)))
    .orderBy(desc(billingContract.effectiveFrom))
    .limit(1);
  return row ? toContract(row) : null;
}

/** Confirmed contracts overlapping `interval`, oldest first. */
export async function contractsOverlapping(
  organizationId: string,
  interval: Interval,
  executor: Executor = db,
): Promise<Contract[]> {
  const rows = await executor
    .select()
    .from(billingContract)
    .where(
      and(
        eq(billingContract.organizationId, organizationId),
        eq(billingContract.status, "confirmed"),
        lt(billingContract.effectiveFrom, interval.end),
        or(
          isNull(billingContract.effectiveUntil),
          gt(billingContract.effectiveUntil, interval.start),
        ),
      ),
    )
    .orderBy(asc(billingContract.effectiveFrom));
  return rows.map(toContract);
}

/** The first confirmed contract starting after `at` (a scheduled change). */
export async function nextContractAfter(
  organizationId: string,
  at: Date,
  executor: Executor = db,
): Promise<Contract | null> {
  const [row] = await executor
    .select()
    .from(billingContract)
    .where(
      and(
        eq(billingContract.organizationId, organizationId),
        eq(billingContract.status, "confirmed"),
        gt(billingContract.effectiveFrom, at),
      ),
    )
    .orderBy(asc(billingContract.effectiveFrom))
    .limit(1);
  return row ? toContract(row) : null;
}

export async function pendingContract(
  organizationId: string,
  executor: Executor = db,
): Promise<Contract | null> {
  const [row] = await executor
    .select()
    .from(billingContract)
    .where(
      and(
        eq(billingContract.organizationId, organizationId),
        eq(billingContract.status, "pending"),
      ),
    )
    .orderBy(desc(billingContract.createdAt))
    .limit(1);
  return row ? toContract(row) : null;
}

export async function getContract(
  organizationId: string,
  id: string,
  executor: Executor = db,
): Promise<Contract | null> {
  const [row] = await executor
    .select()
    .from(billingContract)
    .where(and(eq(billingContract.organizationId, organizationId), eq(billingContract.id, id)))
    .limit(1);
  return row ? toContract(row) : null;
}

export async function listContracts(
  organizationId: string,
  executor: Executor = db,
): Promise<Contract[]> {
  const rows = await executor
    .select()
    .from(billingContract)
    .where(eq(billingContract.organizationId, organizationId))
    .orderBy(desc(billingContract.effectiveFrom), desc(billingContract.createdAt));
  return rows.map(toContract);
}

/** Ids among `contractIds` that a confirmed successor superseded. */
export async function supersededIds(
  contractIds: string[],
  executor: Executor = db,
): Promise<Set<string>> {
  if (!contractIds.length) return new Set();
  const rows = await executor
    .select({ id: billingContract.supersedesId })
    .from(billingContract)
    .where(
      and(
        inArray(billingContract.supersedesId, contractIds),
        eq(billingContract.status, "confirmed"),
      ),
    );
  return new Set(rows.flatMap((row) => (row.id ? [row.id] : [])));
}

/**
 * Ends what is in effect at `at` there, and cancels confirmed contracts scheduled from `at` on.
 * Returns the contract that was in effect (the new one supersedes it).
 */
async function supersedeAt(
  tx: Transaction,
  organizationId: string,
  at: Date,
  now: Date,
): Promise<Contract | null> {
  const current = await contractAt(organizationId, at, tx);
  if (current) {
    await tx
      .update(billingContract)
      .set({ effectiveUntil: at })
      .where(eq(billingContract.id, current.id));
  }
  await tx
    .update(billingContract)
    .set({ status: "canceled", canceledAt: now })
    .where(
      and(
        eq(billingContract.organizationId, organizationId),
        eq(billingContract.status, "confirmed"),
        gte(billingContract.effectiveFrom, at),
      ),
    );
  return current;
}

export type NewContract = {
  organizationId: string;
  accountId: string;
  kind: ContractRow["kind"];
  status: "pending" | "confirmed";
  terms: ContractTerms;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
  termEnd?: Date | null;
  autoRenew?: boolean;
  createdByUserId?: string | null;
  note?: string | null;
  reference?: string | null;
  pendingExpiresAt?: Date | null;
};

/** Inserts a contract; a confirmed one takes over at its `effectiveFrom`. Hold the account lock. */
export async function insertContract(
  tx: Transaction,
  input: NewContract,
  now: Date,
): Promise<Contract> {
  const previous =
    input.status === "confirmed"
      ? await supersedeAt(tx, input.organizationId, input.effectiveFrom, now)
      : null;
  const [row] = await tx
    .insert(billingContract)
    .values({
      organizationId: input.organizationId,
      accountId: input.accountId,
      kind: input.kind,
      status: input.status,
      plan: input.terms.plan,
      terms: storedTerms(input.terms),
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? null,
      termEnd: input.termEnd ?? null,
      autoRenew: input.autoRenew ?? false,
      supersedesId: previous?.id ?? null,
      createdByUserId: input.createdByUserId ?? null,
      note: input.note ?? null,
      reference: input.reference ?? null,
      pendingExpiresAt: input.pendingExpiresAt ?? null,
    })
    .returning();
  if (!row) throw new Error("Contract insert returned nothing.");
  return toContract(row);
}

/** Confirms a pending contract (its upgrade invoice was paid). Hold the account lock. */
export async function confirmContract(
  tx: Transaction,
  contract: Contract,
  now: Date,
): Promise<Contract> {
  const previous = await supersedeAt(tx, contract.organizationId, contract.effectiveFrom, now);
  const [row] = await tx
    .update(billingContract)
    .set({
      status: "confirmed",
      supersedesId: previous?.id ?? null,
      pendingExpiresAt: null,
    })
    .where(and(eq(billingContract.id, contract.id), eq(billingContract.status, "pending")))
    .returning();
  return row ? toContract(row) : contract;
}

export async function cancelContract(
  tx: Transaction,
  contractId: string,
  now: Date,
): Promise<void> {
  await tx
    .update(billingContract)
    .set({ status: "canceled", canceledAt: now, pendingExpiresAt: null })
    .where(eq(billingContract.id, contractId));
}

/** Ends a contract at `at` (a cancellation at the period's end), without a successor. */
export async function endContractAt(tx: Transaction, contractId: string, at: Date): Promise<void> {
  await tx
    .update(billingContract)
    .set({ effectiveUntil: at })
    .where(eq(billingContract.id, contractId));
}

/** Clears a scheduled end (undoing a cancellation). */
export async function clearContractEnd(tx: Transaction, contractId: string): Promise<void> {
  await tx
    .update(billingContract)
    .set({ effectiveUntil: null })
    .where(eq(billingContract.id, contractId));
}

export async function setPendingInvoice(
  tx: Transaction,
  contractId: string,
  invoiceId: string,
): Promise<void> {
  await tx
    .update(billingContract)
    .set({ pendingInvoiceId: invoiceId })
    .where(eq(billingContract.id, contractId));
}

/** The pending contract waiting for `invoiceId` to be paid. */
export async function contractPendingOn(
  invoiceId: string,
  executor: Executor = db,
): Promise<Contract | null> {
  const [row] = await executor
    .select()
    .from(billingContract)
    .where(
      and(eq(billingContract.pendingInvoiceId, invoiceId), eq(billingContract.status, "pending")),
    )
    .limit(1);
  return row ? toContract(row) : null;
}
