/**
 * How a submission that wasn't accepted at once becomes accepted: the submitter clicks the
 * verification link (`confirmFormSubmission`, system-level: the submission comes from the token),
 * or someone releases it from held or spam (`releaseSubmission`, which also tells Risk the
 * assessment was legitimate). Either way it is recorded like an accepted post (`recordAccepted`).
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { UsageGate } from "@coss/billing/gate";
import { db, schema, type Transaction } from "@coss/db";
import { ID_PREFIXES, isId } from "@coss/db/id";
import { type RiskFeedbackActor, type RiskHasher, recordRiskFeedback } from "@coss/risk";
import { and, eq, exists, inArray, sql } from "drizzle-orm";
import { FormError } from "./errors.ts";
import { type FormRow, hostedOf } from "./forms.ts";
import { type FormSubmissionRow, isUsageLimitError, recordAccepted } from "./record.ts";

const {
  environment,
  form,
  formDelivery,
  formSubmission,
  organizationDeletion,
  organizationSuspension,
} = schema;

/** `cossf_` + 32 random bytes, base64url: the submitter's verification token. */
const TOKEN_PATTERN = /^cossf_[A-Za-z0-9_-]{43}$/;

export function mintConfirmationToken(): { token: string; hash: string } {
  const token = `cossf_${randomBytes(32).toString("base64url")}`;
  return { token, hash: tokenHash(token) };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ConfirmationForm = {
  name: string;
  redirectUrl: string | null;
  successMessage: string | null;
  allowedOrigins: string[];
};

type Pending = { submission: FormSubmissionRow; form: FormRow; sandbox: boolean };

/** With a transaction, the submission row stays locked until it commits. */
async function pendingByToken(
  token: string,
  now: Date,
  tx: Transaction | null,
): Promise<Pending | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const hash = tokenHash(token);
  const query = (tx ?? db)
    .select({ submission: formSubmission, form, mode: environment.mode })
    .from(formSubmission)
    .innerJoin(
      form,
      and(
        eq(form.id, formSubmission.formId),
        eq(form.organizationId, formSubmission.organizationId),
      ),
    )
    .innerJoin(
      environment,
      and(
        eq(environment.id, formSubmission.environmentId),
        eq(environment.organizationId, formSubmission.organizationId),
      ),
    )
    .where(eq(formSubmission.confirmationTokenHash, hash))
    .limit(1);
  const [row] = tx ? await query.for("update", { of: formSubmission }) : await query;
  if (!row?.submission.confirmationTokenHash) return null;
  // Constant time, though the index lookup already matched it.
  const stored = Buffer.from(row.submission.confirmationTokenHash, "hex");
  if (!timingSafeEqual(stored, Buffer.from(hash, "hex"))) return null;
  if (row.submission.confirmationExpiresAt && row.submission.confirmationExpiresAt <= now) {
    return null;
  }
  return { submission: row.submission, form: row.form, sandbox: row.mode === "sandbox" };
}

function shown(row: FormRow): ConfirmationForm {
  return {
    name: row.name,
    redirectUrl: row.redirectUrl,
    successMessage: hostedOf(row).successMessage,
    allowedOrigins: row.allowedOrigins,
  };
}

/** What the verification page shows before the submitter confirms (a GET changes nothing). */
export async function findConfirmation(
  token: string,
  now: Date = new Date(),
): Promise<{ form: ConfirmationForm; confirmed: boolean } | null> {
  const pending = await pendingByToken(token, now, null);
  if (!pending) return null;
  return {
    form: shown(pending.form),
    confirmed: pending.submission.status !== "pending_confirmation",
  };
}

/**
 * Confirms the submission the token names: `pending_confirmation` → `accepted`. A second click
 * changes nothing (`already_confirmed`). `unavailable`: the form doesn't take submissions now
 * (turned off or taken down, the organization suspended or being deleted, a capped plan's
 * submissions used up), so the submission stays pending (the link works until it expires).
 * `null`: no such (unexpired) token.
 */
export async function confirmFormSubmission(
  token: string,
  now: Date = new Date(),
  billing?: UsageGate,
): Promise<{
  outcome: "confirmed" | "already_confirmed" | "unavailable";
  form: ConfirmationForm;
} | null> {
  return db.transaction(async (tx) => {
    const pending = await pendingByToken(token, now, tx);
    if (!pending) return null;
    if (pending.submission.status !== "pending_confirmation") {
      return { outcome: "already_confirmed" as const, form: shown(pending.form) };
    }
    const unavailable = { outcome: "unavailable" as const, form: shown(pending.form) };
    if (!pending.form.enabled || pending.form.disabledByAdminAt) return unavailable;
    const organizationId = pending.submission.organizationId;
    const [held] = await tx
      .select({ id: organizationSuspension.organizationId })
      .from(organizationSuspension)
      .where(eq(organizationSuspension.organizationId, organizationId))
      .union(
        tx
          .select({ id: organizationDeletion.organizationId })
          .from(organizationDeletion)
          .where(
            and(
              eq(organizationDeletion.organizationId, organizationId),
              eq(organizationDeletion.status, "pending"),
            ),
          ),
      )
      .limit(1);
    if (held) return unavailable;
    try {
      // A savepoint: past a capped plan's limit nothing of the acceptance stays.
      return await tx.transaction(async (savepoint) => {
        const [updated] = await savepoint
          .update(formSubmission)
          .set({ status: "accepted", confirmedAt: now, acceptedAt: now })
          .where(
            and(
              eq(formSubmission.id, pending.submission.id),
              eq(formSubmission.organizationId, organizationId),
              eq(formSubmission.status, "pending_confirmation"),
            ),
          )
          .returning();
        if (!updated) return { outcome: "already_confirmed" as const, form: shown(pending.form) };
        await recordAccepted(
          savepoint,
          { form: pending.form, sandbox: pending.sandbox, billing },
          updated,
          {
            occurredAt: now,
            message: `Submission to ${pending.form.name} confirmed by the submitter`,
          },
        );
        return { outcome: "confirmed" as const, form: shown(pending.form) };
      });
    } catch (error) {
      if (isUsageLimitError(error)) return unavailable;
      throw error;
    }
  });
}

export type ReleaseActor =
  | { kind: "user"; userId: string }
  | { kind: "api_key"; apiKeyId: string | null };

/**
 * Releases a `held` or `spam` submission: it is accepted and delivered (verification skipped:
 * a person vouched for it), and Risk learns its assessment was legitimate.
 */
export async function releaseSubmission(
  input: { organizationId: string; environmentId: string; submissionId: string },
  opts: { actor: ReleaseActor; riskHash: RiskHasher; billing?: UsageGate; now?: Date },
): Promise<FormSubmissionRow> {
  if (!isId(ID_PREFIXES.formSubmission, input.submissionId)) {
    throw new FormError("not_found", "Submission not found.");
  }
  const now = opts.now ?? new Date();
  const released = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ submission: formSubmission, form, mode: environment.mode })
      .from(formSubmission)
      .innerJoin(
        form,
        and(
          eq(form.id, formSubmission.formId),
          eq(form.organizationId, formSubmission.organizationId),
        ),
      )
      .innerJoin(
        environment,
        and(
          eq(environment.id, formSubmission.environmentId),
          eq(environment.organizationId, formSubmission.organizationId),
        ),
      )
      .where(
        and(
          eq(formSubmission.id, input.submissionId),
          eq(formSubmission.organizationId, input.organizationId),
          eq(formSubmission.environmentId, input.environmentId),
        ),
      )
      .for("update", { of: formSubmission })
      .limit(1);
    if (!row) throw new FormError("not_found", "Submission not found.");
    if (row.submission.status === "accepted") return row.submission;
    if (row.submission.status !== "held" && row.submission.status !== "spam") {
      throw new FormError(
        "submission_not_releasable",
        "Only held and spam submissions can be released.",
      );
    }
    const by =
      opts.actor.kind === "user" ? `user:${opts.actor.userId}` : `api_key:${opts.actor.apiKeyId}`;
    const [updated] = await tx
      .update(formSubmission)
      .set({
        status: "accepted",
        acceptedAt: now,
        releasedAt: now,
        releasedBy: by,
        spamReason: null,
      })
      .where(
        and(
          eq(formSubmission.id, row.submission.id),
          eq(formSubmission.organizationId, input.organizationId),
          inArray(formSubmission.status, ["held", "spam"]),
        ),
      )
      .returning();
    if (!updated) throw new FormError("submission_not_releasable", "The submission changed.");
    await recordAccepted(
      tx,
      { form: row.form, sandbox: row.mode === "sandbox", billing: opts.billing },
      updated,
      { occurredAt: now, message: `Submission to ${row.form.name} released` },
    );
    return updated;
  });
  if (released.riskAssessmentId) {
    const actor: RiskFeedbackActor =
      opts.actor.kind === "user"
        ? { source: "dashboard", actorId: opts.actor.userId }
        : { source: "api", actorId: opts.actor.apiKeyId };
    // After the commit, and never failing the release: the submission is out either way.
    await recordRiskFeedback(
      opts.riskHash,
      { organizationId: input.organizationId, environmentId: input.environmentId },
      released.riskAssessmentId,
      { outcome: "legitimate", note: "Released from a form's spam or held submissions." },
      actor,
    ).catch((error) => {
      console.error(`[forms] risk feedback for ${released.id} failed:`, error);
    });
  }
  return released;
}

/** Stores a fresh verification token's hash on a pending submission (each email mints one). */
export async function storeConfirmationToken(
  submission: Pick<FormSubmissionRow, "id" | "organizationId">,
  hash: string,
  expiresAt: Date,
  /**
   * The verification delivery's claim: written only while that attempt is still the current one,
   * so a worker whose lease was taken over never replaces the newer attempt's token.
   */
  claim?: { deliveryId: string; attempts: number },
): Promise<boolean> {
  const rows = await db
    .update(formSubmission)
    .set({ confirmationTokenHash: hash, confirmationExpiresAt: expiresAt })
    .where(
      and(
        eq(formSubmission.id, submission.id),
        eq(formSubmission.organizationId, submission.organizationId),
        sql`${formSubmission.status} = 'pending_confirmation'`,
        claim
          ? exists(
              db
                .select({ id: formDelivery.id })
                .from(formDelivery)
                .where(
                  and(
                    eq(formDelivery.id, claim.deliveryId),
                    eq(formDelivery.organizationId, submission.organizationId),
                    eq(formDelivery.attempts, claim.attempts),
                  ),
                ),
            )
          : undefined,
      ),
    )
    .returning({ id: formSubmission.id });
  return rows.length > 0;
}

/**
 * Puts a submission's previous verification token back after the email of `replaced` couldn't
 * be queued: only while `replaced` is still the stored one.
 */
export async function restoreConfirmationToken(
  submission: Pick<FormSubmissionRow, "id" | "organizationId">,
  replaced: string,
  previous: { hash: string | null; expiresAt: Date | null },
): Promise<void> {
  await db
    .update(formSubmission)
    .set({ confirmationTokenHash: previous.hash, confirmationExpiresAt: previous.expiresAt })
    .where(
      and(
        eq(formSubmission.id, submission.id),
        eq(formSubmission.organizationId, submission.organizationId),
        eq(formSubmission.confirmationTokenHash, replaced),
      ),
    );
}
