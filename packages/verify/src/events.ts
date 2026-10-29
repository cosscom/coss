/**
 * What happens to a verification: a log line (`source: verify`) for each step, and a
 * `verification.*` webhook when it is approved, fails or is blocked, in the caller's transaction.
 * Neither ever carries the code.
 */
import type { Executor } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { appendLogEntries } from "@coss/logs";
import type { LogLevel } from "@coss/logs/schemas";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { VERIFY_FAILURES, type VerifyRequestRow } from "./read.ts";
import type { StoredVerificationWebhookEvent, VerifyWebhookEventType } from "./schemas.ts";

export type VerifyEventType =
  | "started"
  | "sent"
  | "check_failed"
  | "approved"
  | "failed"
  | "blocked"
  | "canceled";

const LEVEL: Record<VerifyEventType, LogLevel> = {
  started: "info",
  sent: "info",
  check_failed: "warning",
  approved: "info",
  failed: "error",
  blocked: "warning",
  canceled: "info",
};

const WEBHOOK: Partial<Record<VerifyEventType, VerifyWebhookEventType>> = {
  approved: "verification.approved",
  failed: "verification.failed",
  blocked: "verification.blocked",
};

function describe(type: VerifyEventType, row: VerifyRequestRow, detail?: string): string {
  switch (type) {
    case "started":
      return `Started a verification for ${row.to} (${row.channel})`;
    case "sent":
      return `Sent a code to ${row.to}${detail ? ` (${detail})` : ""}`;
    case "check_failed":
      return `Wrong code for ${row.to} (attempt ${row.attempts} of ${row.maxAttempts})`;
    case "approved":
      return `Approved ${row.to}`;
    case "failed":
      return `Failed: ${VERIFY_FAILURES[row.failureCode ?? ""] ?? "the verification ended"}`;
    case "blocked":
      return `Blocked ${row.to}: ${row.riskReasons.map((reason) => reason.code).join(", ")}`;
    case "canceled":
      return "Canceled";
  }
}

/** Records a step of `row` (as it is after the step). */
export async function recordVerifyEvent(
  tx: Executor,
  row: VerifyRequestRow,
  type: VerifyEventType,
  opts: { sandbox: boolean; detail?: string; occurredAt?: Date },
): Promise<void> {
  const occurredAt = opts.occurredAt ?? new Date();
  const eventId = newId(ID_PREFIXES.webhookEvent);
  const webhookType = WEBHOOK[type];
  if (webhookType) {
    const payload: StoredVerificationWebhookEvent = {
      id: eventId,
      object: "event",
      type: webhookType,
      created_at: new Date().toISOString(),
      data: {
        verification_id: row.id,
        channel: row.channel,
        to: row.to,
        status: row.status,
        failure:
          row.status === "failed" && row.failureCode
            ? { code: row.failureCode, message: VERIFY_FAILURES[row.failureCode] ?? "" }
            : null,
        reasons: row.riskReasons,
        tags: row.tags,
        sandbox: opts.sandbox,
        occurred_at: occurredAt.toISOString(),
      },
    };
    await enqueueWebhookMessage(tx, {
      id: eventId,
      organizationId: row.organizationId,
      environmentId: row.environmentId,
      type: webhookType,
      payload,
    });
  }
  await appendLogEntries(tx, [
    {
      organizationId: row.organizationId,
      projectId: row.projectId,
      environmentId: row.environmentId,
      occurredAt,
      source: "verify",
      level: LEVEL[type],
      type: `verification.${type}`,
      message: describe(type, row, opts.detail),
      apiKeyId: row.apiKeyId,
      resourceType: "verification",
      resourceId: row.id,
      recipient: row.to,
      errorCode: type === "failed" ? row.failureCode : null,
      attributes: {
        channel: row.channel,
        status: row.status,
        ...(type === "blocked" ? { reasons: row.riskReasons } : {}),
        ...(type === "check_failed" ? { attempts: row.attempts } : {}),
      },
    },
  ]);
}
