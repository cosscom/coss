/**
 * An environment's risk settings: decision thresholds, reasons turned off, and the captcha provider
 * assessments verify tokens with. Environments without a row use the defaults. The captcha secret
 * is encrypted with the webhook secrets key ring (`WEBHOOK_SECRETS_KEY`) and never returned.
 */
import { db, type Executor, schema } from "@coss/db";
import { decryptSecret, encryptSecret, type SecretsKeyRing } from "@coss/webhooks";
import { and, eq } from "drizzle-orm";
import { RiskError } from "./errors.ts";
import {
  CONTENT_CATEGORIES,
  type ContentCategory,
  DEFAULT_THRESHOLDS,
  type RiskCaptchaProvider,
  type RiskReasonCode,
  type RiskSettingsOutput,
  type UpdateRiskSettingsRequestOutput,
} from "./schemas.ts";

const { riskSettings } = schema;

type Scope = { organizationId: string; environmentId: string };

/** The settings an assessment applies (defaults filled in). */
export type ResolvedRiskSettings = {
  thresholds: { review: number; block: number };
  disabledReasons: ReadonlySet<RiskReasonCode>;
  captcha: { provider: RiskCaptchaProvider; secretCiphertext: string; required: boolean } | null;
  /** Categories without a threshold never fire `content.*`. */
  contentThresholds: Partial<Record<ContentCategory, number>>;
};

/** Stored thresholds, keeping only known categories with a sane value. */
function contentThresholdsOf(stored: unknown): Partial<Record<ContentCategory, number>> {
  const thresholds: Partial<Record<ContentCategory, number>> = {};
  if (!stored || typeof stored !== "object") return thresholds;
  for (const category of CONTENT_CATEGORIES) {
    const value = (stored as Record<string, unknown>)[category];
    if (typeof value === "number" && value > 0 && value <= 1) thresholds[category] = value;
  }
  return thresholds;
}

type SettingsRow = typeof riskSettings.$inferSelect;

async function settingsRow(executor: Executor, scope: Scope): Promise<SettingsRow | null> {
  const [row] = await executor
    .select()
    .from(riskSettings)
    .where(
      and(
        eq(riskSettings.organizationId, scope.organizationId),
        eq(riskSettings.environmentId, scope.environmentId),
      ),
    )
    .limit(1);
  return row ?? null;
}

function resolve(row: SettingsRow | null): ResolvedRiskSettings {
  return {
    thresholds: row
      ? {
          // PostgreSQL `real` adds float32 noise; scores and settings use three decimals.
          review: Math.round(row.reviewThreshold * 1000) / 1000,
          block: Math.round(row.blockThreshold * 1000) / 1000,
        }
      : { ...DEFAULT_THRESHOLDS },
    disabledReasons: new Set((row?.disabledReasons ?? []) as RiskReasonCode[]),
    captcha:
      row?.captchaProvider && row.captchaSecretCiphertext
        ? {
            provider: row.captchaProvider,
            secretCiphertext: row.captchaSecretCiphertext,
            required: row.captchaRequired,
          }
        : null,
    contentThresholds: contentThresholdsOf(row?.contentThresholds),
  };
}

export async function resolveRiskSettings(
  executor: Executor,
  scope: Scope,
): Promise<ResolvedRiskSettings> {
  return resolve(await settingsRow(executor, scope));
}

/** The captcha secret in clear, for verifying a token. */
export function captchaSecret(settings: ResolvedRiskSettings, keys: SecretsKeyRing): string | null {
  return settings.captcha ? decryptSecret(settings.captcha.secretCiphertext, keys) : null;
}

function toObject(row: SettingsRow | null): RiskSettingsOutput {
  const resolved = resolve(row);
  return {
    object: "risk_settings",
    review_threshold: resolved.thresholds.review,
    block_threshold: resolved.thresholds.block,
    disabled_reasons: [...resolved.disabledReasons] as RiskSettingsOutput["disabled_reasons"],
    captcha: resolved.captcha
      ? { provider: resolved.captcha.provider, required: resolved.captcha.required }
      : null,
    content_thresholds: Object.fromEntries(
      CONTENT_CATEGORIES.map((category) => [
        category,
        resolved.contentThresholds[category] ?? null,
      ]),
    ) as RiskSettingsOutput["content_thresholds"],
    updated_at: row?.updatedAt.toISOString() ?? null,
  };
}

export async function getRiskSettings(scope: Scope): Promise<RiskSettingsOutput> {
  return toObject(await settingsRow(db, scope));
}

/**
 * Applies a partial update. Thresholds must stay ordered (review ≤ block); a new captcha provider
 * needs its secret. `null` when the environment isn't in the organization.
 */
export async function updateRiskSettings(
  scope: Scope,
  params: UpdateRiskSettingsRequestOutput,
  keys: SecretsKeyRing,
): Promise<RiskSettingsOutput | null> {
  return db.transaction(async (tx) => {
    const [environment] = await tx
      .select({ id: schema.environment.id })
      .from(schema.environment)
      .where(
        and(
          eq(schema.environment.id, scope.environmentId),
          eq(schema.environment.organizationId, scope.organizationId),
        ),
      )
      .for("update")
      .limit(1);
    if (!environment) return null;
    const current = await settingsRow(tx, scope);
    const resolved = resolve(current);
    const review = params.review_threshold ?? resolved.thresholds.review;
    const block = params.block_threshold ?? resolved.thresholds.block;
    if (review > block) {
      throw new RiskError(
        "invalid_settings",
        "The review threshold can't be above the block threshold.",
        { param: params.review_threshold === undefined ? "block_threshold" : "review_threshold" },
      );
    }
    let captcha: Pick<
      typeof riskSettings.$inferInsert,
      "captchaProvider" | "captchaSecretCiphertext" | "captchaRequired"
    > = {};
    if (params.captcha === null) {
      captcha = { captchaProvider: null, captchaSecretCiphertext: null, captchaRequired: false };
    } else if (params.captcha) {
      const sameProvider = resolved.captcha?.provider === params.captcha.provider;
      if (!params.captcha.secret && !sameProvider) {
        throw new RiskError("invalid_settings", "Give the captcha provider's secret key.", {
          param: "captcha.secret",
        });
      }
      captcha = {
        captchaProvider: params.captcha.provider,
        captchaSecretCiphertext: params.captcha.secret
          ? encryptSecret(params.captcha.secret, keys)
          : resolved.captcha?.secretCiphertext,
        captchaRequired: params.captcha.required ?? resolved.captcha?.required ?? false,
      };
    }
    const contentThresholds = { ...resolved.contentThresholds };
    for (const category of CONTENT_CATEGORIES) {
      const value = params.content_thresholds?.[category];
      if (value === null) delete contentThresholds[category];
      else if (value !== undefined) contentThresholds[category] = value;
    }
    const values = {
      reviewThreshold: review,
      contentThresholds,
      blockThreshold: block,
      disabledReasons: params.disabled_reasons
        ? [...new Set(params.disabled_reasons)].sort()
        : [...resolved.disabledReasons],
      ...captcha,
    };
    const [row] = await tx
      .insert(riskSettings)
      .values({ ...scope, ...values })
      .onConflictDoUpdate({ target: riskSettings.environmentId, set: values })
      .returning();
    return toObject(row ?? null);
  });
}
