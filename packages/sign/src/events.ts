/**
 * The audit trail: every event about a request, append-only and hash-chained. An event's `hash`
 * is the SHA-256 of its canonical JSON (`signEventHashInput`), which includes the previous
 * event's hash, so the trail can be checked from its first event on (`verifySignEventChain`).
 */
import { createHash } from "node:crypto";
import { type Executor, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { canonicalJson } from "@coss/db/idempotency";
import type { SignEventDetails } from "@coss/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { SignEventActor, SignEventObjectOutput, SignEventType } from "./schemas.ts";

const { signEvent, signRequest } = schema;

export type SignEventRow = typeof signEvent.$inferSelect;

/** Who caused an event, and from where (the API's caller or the signer's browser). */
export type SignActor = {
  kind: SignEventActor;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AppendSignEvent = {
  organizationId: string;
  requestId: string;
  type: SignEventType;
  signerId?: string | null;
  actor: SignActor;
  details?: SignEventDetails;
  occurredAt?: Date;
};

/** What an event's hash covers: everything it says, in the wire format, plus its predecessor. */
export function signEventHashInput(event: {
  id: string;
  requestId: string;
  sequence: number;
  type: string;
  signerId: string | null;
  actor: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: SignEventDetails;
  occurredAt: Date;
  previousHash: string | null;
}): string {
  return canonicalJson({
    id: event.id,
    request_id: event.requestId,
    sequence: event.sequence,
    type: event.type,
    signer_id: event.signerId,
    actor: event.actor,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    details: event.details,
    occurred_at: event.occurredAt.toISOString(),
    previous_hash: event.previousHash,
  });
}

export function signEventHash(event: Parameters<typeof signEventHashInput>[0]): string {
  return createHash("sha256").update(signEventHashInput(event)).digest("hex");
}

/**
 * Appends an event in the caller's transaction. It locks the request row first, so concurrent
 * appends to one request queue up and the chain stays gapless.
 */
export async function appendSignEvent(tx: Executor, input: AppendSignEvent): Promise<SignEventRow> {
  await tx
    .select({ id: signRequest.id })
    .from(signRequest)
    .where(
      and(
        eq(signRequest.id, input.requestId),
        eq(signRequest.organizationId, input.organizationId),
      ),
    )
    .for("update");
  const [last] = await tx
    .select({ sequence: signEvent.sequence, hash: signEvent.hash })
    .from(signEvent)
    .where(
      and(
        eq(signEvent.requestId, input.requestId),
        eq(signEvent.organizationId, input.organizationId),
      ),
    )
    .orderBy(desc(signEvent.sequence))
    .limit(1);
  const values = {
    id: newId(ID_PREFIXES.signEvent),
    organizationId: input.organizationId,
    requestId: input.requestId,
    sequence: (last?.sequence ?? 0) + 1,
    type: input.type,
    signerId: input.signerId ?? null,
    actor: input.actor.kind,
    ipAddress: input.actor.ipAddress ?? null,
    userAgent: input.actor.userAgent ?? null,
    details: input.details ?? {},
    // Millisecond precision, like Postgres keeps it, so the stored row hashes the same.
    occurredAt: new Date(Math.floor((input.occurredAt ?? new Date()).getTime())),
    previousHash: last?.hash ?? null,
  };
  const [row] = await tx
    .insert(signEvent)
    .values({ ...values, hash: signEventHash(values) })
    .returning();
  if (!row) throw new Error("sign_event insert returned nothing");
  return row;
}

/** The sequence number of the first event that doesn't match the chain, or `null` if all do. */
export function verifySignEventChain(events: readonly SignEventRow[]): number | null {
  let previousHash: string | null = null;
  let sequence = 0;
  for (const event of events) {
    sequence++;
    if (
      event.sequence !== sequence ||
      event.previousHash !== previousHash ||
      signEventHash(event) !== event.hash
    ) {
      return event.sequence;
    }
    previousHash = event.hash;
  }
  return null;
}

export function toSignEventObject(row: SignEventRow): SignEventObjectOutput {
  return {
    object: "sign_event",
    id: row.id,
    sequence: row.sequence,
    type: row.type,
    signer_id: row.signerId,
    actor: row.actor as SignEventActor,
    ip_address: row.ipAddress,
    user_agent: row.userAgent,
    details: row.details,
    occurred_at: row.occurredAt.toISOString(),
    previous_hash: row.previousHash,
    hash: row.hash,
  };
}
