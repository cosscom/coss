/**
 * What a submission's state changes record, in the caller's transaction: accepting it (usage, the
 * `form.submission.received` webhook, a log line and the deliveries it owes), flagging it (the
 * `form.submission.flagged` webhook, except for honeypot catches) and holding it for the
 * submitter's confirmation (the verification email's delivery).
 */

import type { UsageGate } from "@coss/billing/gate";
import { recordUsage } from "@coss/billing/metering";
import { type Executor, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { appendLogEntries, type LogEntryInput } from "@coss/logs";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, eq, isNull } from "drizzle-orm";
import { contactsOf, type FormRow } from "./forms.ts";
import type { FormWebhookEventType, StoredFormSubmissionWebhookEvent } from "./schemas.ts";

const { formDelivery, formSubmission, formSubmissionFile } = schema;

export type FormSubmissionRow = typeof formSubmission.$inferSelect;
type FileRow = typeof formSubmissionFile.$inferSelect;

/** The form (as the submission saw it) and whether its environment is a sandbox. */
export type SubmissionContext = {
  form: Pick<
    FormRow,
    | "id"
    | "name"
    | "organizationId"
    | "projectId"
    | "environmentId"
    | "notifyRecipients"
    | "contacts"
  >;
  sandbox: boolean;
  /** Reserves capped plans' `forms.submissions` as a submission is accepted (live only). */
  billing?: UsageGate | undefined;
};

/** A capped plan's `forms.submissions` are used up (`UsageGate.reserve`'s `BillingError`). */
export function isUsageLimitError(error: unknown): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === "usage_limit_exceeded";
}

function payload(
  type: FormWebhookEventType,
  id: string,
  context: SubmissionContext,
  submission: FormSubmissionRow,
  files: FileRow[],
  occurredAt: Date,
): StoredFormSubmissionWebhookEvent {
  return {
    id,
    object: "event",
    type,
    created_at: new Date().toISOString(),
    data: {
      form_id: context.form.id,
      form_name: context.form.name,
      submission_id: submission.id,
      status: submission.status,
      data: submission.data,
      submitter_email: submission.submitterEmail,
      files: files.map((file) => ({
        id: file.id,
        field: file.field,
        filename: file.filename,
        content_type: file.contentType,
        size: file.size,
      })),
      spam_reason: submission.spamReason,
      sandbox: context.sandbox,
      occurred_at: occurredAt.toISOString(),
    },
  };
}

async function filesOf(tx: Executor, submission: FormSubmissionRow): Promise<FileRow[]> {
  return tx
    .select()
    .from(formSubmissionFile)
    .where(
      and(
        eq(formSubmissionFile.submissionId, submission.id),
        eq(formSubmissionFile.organizationId, submission.organizationId),
      ),
    )
    .orderBy(formSubmissionFile.createdAt);
}

function logLine(
  context: SubmissionContext,
  submission: FormSubmissionRow,
  input: { type: string; level: LogEntryInput["level"]; message: string; occurredAt: Date },
): LogEntryInput {
  return {
    organizationId: context.form.organizationId,
    projectId: context.form.projectId,
    environmentId: context.form.environmentId,
    occurredAt: input.occurredAt,
    source: "forms",
    level: input.level,
    type: input.type,
    message: input.message,
    resourceType: "form_submission",
    resourceId: submission.id,
    recipient: submission.submitterEmail,
    clientIp: submission.ip,
    userAgent: submission.userAgent,
    attributes: {
      form_id: context.form.id,
      status: submission.status,
      ...(submission.spamReason ? { spam_reason: submission.spamReason } : {}),
      ...(submission.riskAssessmentId ? { risk_assessment_id: submission.riskAssessmentId } : {}),
    },
    searchTerms: [context.form.id],
  };
}

/**
 * A submission that became `accepted` (the caller set the status): metered once (live only,
 * compare-and-set on `usage_recorded_at`), announced, logged, and its deliveries queued.
 */
export async function recordAccepted(
  tx: Executor,
  context: SubmissionContext,
  submission: FormSubmissionRow,
  input: { occurredAt: Date; message?: string },
): Promise<void> {
  if (!context.sandbox) {
    const [metered] = await tx
      .update(formSubmission)
      .set({ usageRecordedAt: input.occurredAt })
      .where(
        and(
          eq(formSubmission.id, submission.id),
          eq(formSubmission.organizationId, submission.organizationId),
          isNull(formSubmission.usageRecordedAt),
        ),
      )
      .returning({ id: formSubmission.id });
    if (metered) {
      // Throws past a capped plan's limit: the caller's transaction then accepts nothing.
      await context.billing?.reserve(tx, {
        organizationId: context.form.organizationId,
        meter: "forms.submissions",
        quantity: 1,
      });
      await recordUsage(tx, {
        organizationId: context.form.organizationId,
        environmentId: context.form.environmentId,
        projectId: context.form.projectId,
        meter: "forms.submissions",
        quantity: 1,
      });
    }
  }
  const files = await filesOf(tx, submission);
  const id = newId(ID_PREFIXES.webhookEvent);
  await enqueueWebhookMessage(tx, {
    id,
    organizationId: context.form.organizationId,
    environmentId: context.form.environmentId,
    type: "form.submission.received",
    payload: payload("form.submission.received", id, context, submission, files, input.occurredAt),
  });
  const kinds: (typeof formDelivery.$inferInsert)["kind"][] = [];
  if (context.form.notifyRecipients.length > 0) kinds.push("notification");
  if (contactsOf(context.form).enabled && submission.submitterEmail) kinds.push("contact");
  if (kinds.length > 0) {
    await tx
      .insert(formDelivery)
      .values(
        kinds.map((kind) => ({
          organizationId: submission.organizationId,
          environmentId: submission.environmentId,
          submissionId: submission.id,
          kind,
        })),
      )
      .onConflictDoNothing();
  }
  await appendLogEntries(tx, [
    logLine(context, submission, {
      type: "form_submission.received",
      level: "info",
      message: input.message ?? `Submission to ${context.form.name} received`,
      occurredAt: input.occurredAt,
    }),
  ]);
}

/** A submission stored as `held` or `spam`: announced (unless the honeypot caught it) and logged. */
export async function recordFlagged(
  tx: Executor,
  context: SubmissionContext,
  submission: FormSubmissionRow,
  input: { occurredAt: Date },
): Promise<void> {
  if (submission.spamReason !== "honeypot") {
    const id = newId(ID_PREFIXES.webhookEvent);
    await enqueueWebhookMessage(tx, {
      id,
      organizationId: context.form.organizationId,
      environmentId: context.form.environmentId,
      type: "form.submission.flagged",
      payload: payload(
        "form.submission.flagged",
        id,
        context,
        submission,
        await filesOf(tx, submission),
        input.occurredAt,
      ),
    });
  }
  await appendLogEntries(tx, [
    logLine(context, submission, {
      type: `form_submission.${submission.status}`,
      level: "warning",
      message:
        submission.status === "held"
          ? `Submission to ${context.form.name} held for review`
          : `Submission to ${context.form.name} flagged as spam`,
      occurredAt: input.occurredAt,
    }),
  ]);
}

/** A submission waiting for the submitter's confirmation: the verification email is queued. */
export async function recordPendingConfirmation(
  tx: Executor,
  context: SubmissionContext,
  submission: FormSubmissionRow,
  input: { occurredAt: Date },
): Promise<void> {
  await tx
    .insert(formDelivery)
    .values({
      organizationId: submission.organizationId,
      environmentId: submission.environmentId,
      submissionId: submission.id,
      kind: "verification",
    })
    .onConflictDoNothing();
  await appendLogEntries(tx, [
    logLine(context, submission, {
      type: "form_submission.pending_confirmation",
      level: "info",
      message: `Submission to ${context.form.name} waiting for the submitter's confirmation`,
      occurredAt: input.occurredAt,
    }),
  ]);
}
