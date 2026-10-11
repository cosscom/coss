/**
 * Screens one outgoing message, the entry point for every product: decides whether it is
 * sampled, asks the classifier, records the verdict and acts on it. Fails open: a classifier
 * error or timeout never stops a message (the sample is owed to the next one instead).
 */
import { db, type Executor, schema } from "@coss/db";
import {
  getReputationStanding,
  markReputationDue,
  policyOf,
  suspendOrganization,
} from "@coss/reputation";
import type { ContentScreeningPolicy } from "@coss/reputation/schemas";
import { and, eq, sql } from "drizzle-orm";
import {
  type ClassifierVerdict,
  type ContentClassifier,
  type ScreeningContent,
  type ScreeningProduct,
  topCategory,
} from "./classifier.ts";
import { shouldScreen } from "./sampling.ts";

const { contentScreening, contentScreeningCounter } = schema;

export type ContentScreeningRow = typeof contentScreening.$inferSelect;
export type ScreeningVerdict = ContentScreeningRow["verdict"];

/** The reputation trigger of screening suspensions and warnings. */
export const CONTENT_SCREENING_TRIGGER = "content_screening";

/** Long enough for a slow decision (Jev answers in well under a second), short enough to send on. */
export const DEFAULT_SCREENING_TIMEOUT_MS = 3000;

export type ScreeningDeps = {
  classifier: ContentClassifier;
  timeoutMs?: number;
  now?: () => Date;
  /** Drives the random part of sampling (tests). */
  random?: () => number;
};

export type ScreenInput = {
  organizationId: string;
  environmentId: string;
  product: ScreeningProduct;
  /** The product's message id, e.g. an email id. */
  subjectId: string;
  /** Called only when the message is sampled, so unsampled messages cost nothing. */
  content: () => ScreeningContent | Promise<ScreeningContent>;
};

export type ScreenOutcome = {
  /** `block`: refuse the message. Only for an enforced `blocked` verdict. */
  action: "send" | "block";
  screening: ContentScreeningRow | null;
};

const SEND: ScreenOutcome = { action: "send", screening: null };

/** Call for live messages only, once per message, right before it is handed to the provider. */
export async function screenMessage(
  input: ScreenInput,
  deps: ScreeningDeps,
): Promise<ScreenOutcome> {
  const now = deps.now ?? (() => new Date());
  const policy = policyOf(await getReputationStanding(input.organizationId)).contentScreening;
  if (!policy.enabled) return SEND;

  const { sequence, owed } = await countMessage(input.organizationId, input.product);
  if (!owed && !shouldScreen(sequence, policy, deps.random)) return SEND;

  const started = performance.now();
  let verdict: ClassifierVerdict;
  try {
    const content = await input.content();
    verdict = await deps.classifier.classify(
      content,
      AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_SCREENING_TIMEOUT_MS),
    );
  } catch (error) {
    console.error(
      `[screening] ${deps.classifier.name} failed on ${input.product} ${input.subjectId}:`,
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );
    const screening = await db.transaction(async (tx) => {
      await tx
        .update(contentScreeningCounter)
        .set({ owed: true })
        .where(
          and(
            eq(contentScreeningCounter.organizationId, input.organizationId),
            eq(contentScreeningCounter.product, input.product),
          ),
        );
      return insertScreening(tx, input, {
        sequence,
        classifier: deps.classifier.name,
        verdict: "error",
        enforced: false,
        latencyMs: elapsed(started),
        errorMessage: error instanceof Error ? error.message.slice(0, 1000) : String(error),
        createdAt: now(),
      });
    });
    return { action: "send", screening };
  }

  const top = topCategory(verdict.scores);
  const outcome = classify(top.score, policy);
  const createdAt = now();
  const screening = await db.transaction(async (tx) => {
    const row = await insertScreening(tx, input, {
      sequence,
      classifier: deps.classifier.name,
      model: verdict.model,
      verdict: outcome,
      enforced: policy.enforce,
      scores: verdict.scores,
      topCategory: top.category,
      topScore: top.score,
      inputTokens: verdict.inputTokens,
      latencyMs: elapsed(started),
      createdAt,
    });
    if (!policy.enforce || outcome === "clean") return row;
    if (outcome === "blocked") {
      await suspendOrganization(
        {
          organizationId: input.organizationId,
          trigger: CONTENT_SCREENING_TRIGGER,
          actor: { kind: "system" },
          note: `${input.product} ${input.subjectId} scored ${top.score.toFixed(2)} for ${top.category} (${row.id}).`,
          now: createdAt,
        },
        tx,
      );
    }
    // The content screening check turns flags into a warning (and keeps a block suspended).
    await markReputationDue(tx, input.organizationId, createdAt);
    return row;
  });
  return { action: policy.enforce && outcome === "blocked" ? "block" : "send", screening };
}

function classify(score: number, policy: ContentScreeningPolicy): ScreeningVerdict {
  if (score >= policy.blockThreshold) return "blocked";
  if (score >= policy.flagThreshold) return "flagged";
  return "clean";
}

/**
 * Counts the message and returns its position plus whether a failed screening left a sample
 * owed (consumed here). One statement, so concurrent workers never share a position.
 */
async function countMessage(
  organizationId: string,
  product: ScreeningProduct,
): Promise<{ sequence: number; owed: boolean }> {
  const result = await db.execute<{ seen: number; owed: boolean | null }>(sql`
    INSERT INTO ${contentScreeningCounter} (organization_id, product, seen, owed)
    VALUES (${organizationId}, ${product}, 1, false)
    ON CONFLICT (organization_id, product)
    DO UPDATE SET seen = ${contentScreeningCounter}.seen + 1, owed = false, updated_at = now()
    RETURNING new.seen AS seen, old.owed AS owed
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Counting the message returned no row.");
  return { sequence: Number(row.seen), owed: row.owed === true };
}

async function insertScreening(
  tx: Executor,
  input: ScreenInput,
  values: Omit<
    typeof contentScreening.$inferInsert,
    "organizationId" | "environmentId" | "product" | "subjectId"
  >,
): Promise<ContentScreeningRow> {
  const [row] = await tx
    .insert(contentScreening)
    .values({
      organizationId: input.organizationId,
      environmentId: input.environmentId,
      product: input.product,
      subjectId: input.subjectId,
      ...values,
    })
    .returning();
  if (!row) throw new Error("Inserting the screening returned no row.");
  return row;
}

function elapsed(started: number): number {
  return Math.round(performance.now() - started);
}
