/**
 * What customers tell risk afterwards: the outcome of an assessment (feedback, which also resolves
 * an open review and teaches the environment's fraud memory) and "forget this user" (their
 * account is gone: drop what identifies them).
 */
import { db, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { appendLogEntries, lineByteSize, logSearchText } from "@coss/logs";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { RiskHasher } from "./hash.ts";
import { inRiskEnvironment, type RiskEnvironmentScope, toRiskAssessmentObject } from "./read.ts";
import type {
  CreateRiskFeedbackRequestOutput,
  RiskAssessmentOutput,
  StoredRiskWebhookEvent,
} from "./schemas.ts";
import { type StoredReason, toReasonObject } from "./score.ts";

const { riskAssessment, riskFeedback, riskIdentity, riskReport, riskUserNetwork } = schema;

export type RiskFeedbackActor = { source: "api" | "dashboard"; actorId: string | null };

/**
 * Records an outcome: `fraud`/`abuse` remember the assessment's mailbox, user, IP and subnet (as
 * hashes) so later assessments flag them; `legitimate` takes back what this assessment reported.
 * Repeating the latest outcome changes nothing. `null` when there is no such assessment.
 */
export async function recordRiskFeedback(
  hash: RiskHasher,
  scope: RiskEnvironmentScope,
  id: string,
  params: CreateRiskFeedbackRequestOutput,
  actor: RiskFeedbackActor,
): Promise<RiskAssessmentOutput | null> {
  const row = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(riskAssessment)
      .where(and(inRiskEnvironment(scope), eq(riskAssessment.id, id)))
      .for("update")
      .limit(1);
    if (!current) return null;
    if (current.outcome === params.outcome && current.reviewStatus !== "open") return current;

    const now = new Date();
    await tx.insert(riskFeedback).values({
      organizationId: current.organizationId,
      assessmentId: current.id,
      outcome: params.outcome,
      source: actor.source,
      actorId: actor.actorId,
      note: params.note ?? null,
      createdAt: now,
    });
    const [updated] = await tx
      .update(riskAssessment)
      .set({
        outcome: params.outcome,
        outcomeAt: now,
        reviewStatus: current.reviewStatus === "open" ? "resolved" : current.reviewStatus,
      })
      .where(eq(riskAssessment.id, current.id))
      .returning();

    const reports = [
      { kind: "mailbox" as const, valueHash: current.emailHash },
      { kind: "ip" as const, valueHash: current.ipHash },
      { kind: "subnet" as const, valueHash: current.subnetHash },
      {
        kind: "user" as const,
        valueHash: current.userId ? hash(current.environmentId, "user", current.userId) : null,
      },
    ].filter((report): report is { kind: typeof report.kind; valueHash: string } =>
      Boolean(report.valueHash),
    );
    if (params.outcome === "legitimate") {
      await tx
        .delete(riskReport)
        .where(
          and(
            eq(riskReport.organizationId, current.organizationId),
            eq(riskReport.environmentId, current.environmentId),
            eq(riskReport.assessmentId, current.id),
          ),
        );
    } else if (reports.length > 0) {
      await tx
        .insert(riskReport)
        .values(
          reports.map((report) => ({
            organizationId: current.organizationId,
            environmentId: current.environmentId,
            kind: report.kind,
            valueHash: report.valueHash,
            assessmentId: current.id,
            reportedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: [
            riskReport.environmentId,
            riskReport.kind,
            riskReport.valueHash,
            riskReport.assessmentId,
          ],
          set: { reportedAt: now },
        });
    }

    await appendLogEntries(tx, [
      {
        organizationId: current.organizationId,
        projectId: current.projectId,
        environmentId: current.environmentId,
        occurredAt: now,
        source: "risk",
        level: "info",
        type: "risk.feedback",
        message: `Feedback on ${current.id}: ${params.outcome}`,
        apiKeyId: actor.source === "api" ? actor.actorId : null,
        resourceType: "risk_assessment",
        resourceId: current.id,
        attributes: { outcome: params.outcome, source: actor.source },
        searchTerms: [params.outcome],
      },
    ]);
    // Resolving a review announces it, so a queue kept elsewhere can close it.
    if (current.reviewStatus === "open") {
      const id = newId(ID_PREFIXES.webhookEvent);
      const payload: StoredRiskWebhookEvent = {
        id,
        object: "event",
        type: "risk.assessment.reviewed",
        created_at: now.toISOString(),
        data: {
          assessment_id: current.id,
          event: current.event,
          event_name: current.eventName,
          decision: current.decision,
          score: Math.round(current.score * 1000) / 1000,
          reasons: (current.reasons as StoredReason[]).map(toReasonObject),
          user_id: current.userId,
          outcome: params.outcome,
          occurred_at: now.toISOString(),
        },
      };
      await enqueueWebhookMessage(tx, {
        id,
        organizationId: current.organizationId,
        environmentId: current.environmentId,
        type: payload.type,
        payload,
        now,
      });
    }
    return updated ?? current;
  });
  return row ? toRiskAssessmentObject(row) : null;
}

/**
 * Forgets one of the customer's users: their mailbox identities and fraud reports are deleted,
 * and their assessments lose the user id, addresses and hashes (decisions and reasons stay).
 * Other assessments that named them as a duplicate's `previous_user` lose that too. Idempotent;
 * returns how many assessments were changed.
 */
export async function forgetRiskUser(
  hash: RiskHasher,
  scope: RiskEnvironmentScope,
  userId: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const inEnvironment = (table: typeof riskIdentity | typeof riskReport) =>
      and(
        eq(table.organizationId, scope.organizationId),
        eq(table.environmentId, scope.environmentId),
      );
    const assessments = await tx
      .select({ id: riskAssessment.id })
      .from(riskAssessment)
      .where(and(inRiskEnvironment(scope), eq(riskAssessment.userId, userId)));
    const ids = assessments.map((assessment) => assessment.id);

    await tx
      .delete(riskIdentity)
      .where(and(inEnvironment(riskIdentity), eq(riskIdentity.userId, userId)));
    await tx
      .delete(riskUserNetwork)
      .where(
        and(
          eq(riskUserNetwork.organizationId, scope.organizationId),
          eq(riskUserNetwork.environmentId, scope.environmentId),
          eq(riskUserNetwork.userHash, hash(scope.environmentId, "user", userId)),
        ),
      );
    await tx
      .delete(riskReport)
      .where(
        and(
          inEnvironment(riskReport),
          eq(riskReport.kind, "user"),
          eq(riskReport.valueHash, hash(scope.environmentId, "user", userId)),
        ),
      );
    if (ids.length > 0) {
      await tx
        .delete(riskReport)
        .where(and(inEnvironment(riskReport), inArray(riskReport.assessmentId, ids)));
      await tx
        .update(riskAssessment)
        .set({
          userId: null,
          email: null,
          ip: null,
          userAgent: null,
          emailHash: null,
          ipHash: null,
          subnetHash: null,
          personalDataPurgedAt: new Date(),
        })
        .where(and(inRiskEnvironment(scope), inArray(riskAssessment.id, ids)));
    }
    // Older assessment logs included user_id and a search copy. Match the attribute directly
    // so repeated forgetting also cleans logs whose assessments have already been purged.
    const { logEntry, logDrainRecord } = schema;
    const logs = await tx
      .select()
      .from(logEntry)
      .where(
        and(
          eq(logEntry.organizationId, scope.organizationId),
          eq(logEntry.environmentId, scope.environmentId),
          eq(logEntry.source, "risk"),
          sql`${logEntry.attributes}->>'user_id' = ${userId}`,
        ),
      )
      .for("update");
    for (const log of logs) {
      const { user_id: _userId, ...attributes } = log.attributes;
      await tx
        .update(logEntry)
        .set({
          attributes,
          searchText: logSearchText({
            ...log,
            searchTerms: [
              attributes.decision,
              ...(Array.isArray(attributes.reasons) ? attributes.reasons : []),
            ].filter((value): value is string => typeof value === "string"),
          }),
        })
        .where(and(eq(logEntry.id, log.id), eq(logEntry.occurredAt, log.occurredAt)));
    }
    const records = await tx
      .select()
      .from(logDrainRecord)
      .where(
        and(
          eq(logDrainRecord.organizationId, scope.organizationId),
          eq(logDrainRecord.source, "risk"),
          sql`${logDrainRecord.line}::jsonb #>> '{attributes,user_id}' = ${userId}`,
          inArray(
            logDrainRecord.drainId,
            tx
              .select({ id: schema.logDrain.id })
              .from(schema.logDrain)
              .where(eq(schema.logDrain.environmentId, scope.environmentId)),
          ),
        ),
      )
      .for("update");
    for (const record of records) {
      const attributes = { ...(record.line.attributes as Record<string, unknown>) };
      delete attributes.user_id;
      const line = { ...record.line, attributes };
      await tx
        .update(logDrainRecord)
        .set({ line, byteSize: lineByteSize(line) })
        .where(eq(logDrainRecord.id, record.id));
    }
    // Duplicates that pointed at this user.
    await tx
      .update(riskAssessment)
      .set({
        reasons: sql`(
          select coalesce(jsonb_agg(
            case when reason->>'previous_user' = ${userId}
              then jsonb_set(reason, '{previous_user}', 'null'::jsonb)
              else reason end
          ), '[]'::jsonb)
          from jsonb_array_elements(${riskAssessment.reasons}) as reason
        )`,
      })
      .where(
        and(
          inRiskEnvironment(scope),
          sql`${riskAssessment.reasons} @> ${JSON.stringify([{ previous_user: userId }])}::jsonb`,
        ),
      );
    return ids.length;
  });
}
