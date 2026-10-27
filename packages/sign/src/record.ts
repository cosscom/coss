/**
 * Recording what happens to a request: the audit trail event, its `sign_request.*` webhook (for
 * the types that have one) and its log line (`source: sign`), all in the caller's transaction.
 */
import type { Executor, schema } from "@coss/db";
import type { SignEventDetails } from "@coss/db/schema";
import { appendLogEntries, type LogEntryInput } from "@coss/logs";
import type { LogLevel } from "@coss/logs/schemas";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { appendSignEvent, type SignActor, type SignEventRow } from "./events.ts";
import {
  SIGN_WEBHOOK_EVENT_OF,
  type SignEventType,
  type StoredSignRequestWebhookEvent,
} from "./schemas.ts";

type RequestRow = typeof schema.signRequest.$inferSelect;
type SignerRow = typeof schema.signSigner.$inferSelect;

/** The request (in its state after the event) and the signer the event is about. */
export type SignEventContext = {
  request: Pick<
    RequestRow,
    "id" | "organizationId" | "projectId" | "environmentId" | "title" | "metadata" | "status"
  >;
  signer?: Pick<SignerRow, "id" | "name" | "email" | "clientRef" | "status"> | null;
  sandbox: boolean;
};

const LEVEL: Record<SignEventType, LogLevel> = {
  created: "info",
  sent: "info",
  notified: "info",
  viewed: "info",
  consented: "info",
  signed: "info",
  declined: "warning",
  reminded: "info",
  canceled: "info",
  expired: "warning",
  completed: "info",
};

function describe(type: SignEventType, signer: SignEventContext["signer"]): string {
  const who = signer ? signer.email : "";
  switch (type) {
    case "created":
      return "Created";
    case "sent":
      return "Sent";
    case "notified":
      return `Notified ${who}`;
    case "viewed":
      return `Viewed by ${who}`;
    case "consented":
      return `${who} agreed to sign electronically`;
    case "signed":
      return `Signed by ${who}`;
    case "declined":
      return `Declined by ${who}`;
    case "reminded":
      return `Reminded ${who}`;
    case "canceled":
      return "Canceled";
    case "expired":
      return "Expired";
    case "completed":
      return "Completed: everyone signed";
  }
}

export async function recordSignEvent(
  tx: Executor,
  context: SignEventContext,
  input: {
    type: SignEventType;
    actor: SignActor;
    details?: SignEventDetails;
    occurredAt?: Date;
  },
): Promise<SignEventRow> {
  const { request, signer } = context;
  const row = await appendSignEvent(tx, {
    organizationId: request.organizationId,
    requestId: request.id,
    type: input.type,
    signerId: signer?.id ?? null,
    actor: input.actor,
    details: input.details,
    occurredAt: input.occurredAt,
  });
  const webhookType = SIGN_WEBHOOK_EVENT_OF[input.type];
  if (webhookType) {
    const payload: StoredSignRequestWebhookEvent = {
      id: row.id,
      object: "event",
      type: webhookType,
      created_at: new Date().toISOString(),
      data: {
        sign_request_id: request.id,
        status: request.status,
        title: request.title,
        metadata: request.metadata,
        signer: signer
          ? {
              id: signer.id,
              name: signer.name,
              email: signer.email,
              client_ref: signer.clientRef,
              status: signer.status,
            }
          : null,
        reason: input.details?.reason ?? null,
        sandbox: context.sandbox,
        occurred_at: row.occurredAt.toISOString(),
      },
    };
    await enqueueWebhookMessage(tx, {
      id: row.id,
      organizationId: request.organizationId,
      environmentId: request.environmentId,
      type: webhookType,
      payload,
    });
  }
  const line: LogEntryInput = {
    organizationId: request.organizationId,
    projectId: request.projectId,
    environmentId: request.environmentId,
    occurredAt: row.occurredAt,
    source: "sign",
    level: LEVEL[input.type],
    type: `sign_request.${input.type}`,
    message: describe(input.type, signer),
    resourceType: "sign_request",
    resourceId: request.id,
    recipient: signer?.email ?? null,
    clientIp: row.ipAddress,
    userAgent: row.userAgent,
    attributes: {
      event_id: row.id,
      sequence: row.sequence,
      actor: row.actor,
      ...(signer ? { signer_id: signer.id } : {}),
      ...(input.details?.reason ? { reason: input.details.reason } : {}),
    },
  };
  await appendLogEntries(tx, [line]);
  return row;
}
