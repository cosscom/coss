/**
 * An environment's marketing settings: the sender name shown by the preference center and the
 * postal address every marketing email carries (CAN-SPAM; marketing can't be sent without one).
 */
import { db, schema } from "@coss/db";
import {
  type ContactEnvironment,
  environmentProject,
  inContactEnvironment,
} from "./contact-properties.ts";
import type { MarketingSettingsOutput } from "./contact-schemas.ts";
import { ContactError } from "./errors.ts";

const { marketingSettings } = schema;

export type MarketingSettingsRow = typeof marketingSettings.$inferSelect;

export async function getMarketingSettingsRow(
  env: ContactEnvironment,
): Promise<MarketingSettingsRow | null> {
  const [row] = await db
    .select()
    .from(marketingSettings)
    .where(inContactEnvironment(marketingSettings, env))
    .limit(1);
  return row ?? null;
}

export function toMarketingSettingsObject(
  row: MarketingSettingsRow | null,
): MarketingSettingsOutput {
  return {
    object: "marketing_settings",
    display_name: row?.displayName ?? null,
    mailing_address: row?.mailingAddress ?? null,
    double_opt_in_default: row?.doubleOptInDefault ?? false,
    confirmation_from: row?.confirmationFrom ?? null,
    confirmation_subject: row?.confirmationSubject ?? null,
    confirmation_html: row?.confirmationHtml ?? null,
    confirmation_text: row?.confirmationText ?? null,
    confirmed_redirect_url: row?.confirmedRedirectUrl ?? null,
  };
}

export async function getMarketingSettings(
  env: ContactEnvironment,
): Promise<MarketingSettingsOutput> {
  return toMarketingSettingsObject(await getMarketingSettingsRow(env));
}

/** Changes the fields given (`null` clears one; omitted ones keep their value). */
export async function updateMarketingSettings(
  env: ContactEnvironment,
  params: {
    display_name?: string | null;
    mailing_address?: string | null;
    double_opt_in_default?: boolean;
    confirmation_from?: string | null;
    confirmation_subject?: string | null;
    confirmation_html?: string | null;
    confirmation_text?: string | null;
    confirmed_redirect_url?: string | null;
  },
): Promise<MarketingSettingsOutput> {
  const projectId = await environmentProject(env);
  if (!projectId) throw new ContactError("not_found", "Environment not found.");
  const fields = {
    displayName: params.display_name,
    mailingAddress: params.mailing_address,
    doubleOptInDefault: params.double_opt_in_default,
    confirmationFrom: params.confirmation_from,
    confirmationSubject: params.confirmation_subject,
    confirmationHtml: params.confirmation_html,
    confirmationText: params.confirmation_text,
    confirmedRedirectUrl: params.confirmed_redirect_url,
  };
  const changes = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Partial<typeof marketingSettings.$inferInsert>;
  const [row] = await db
    .insert(marketingSettings)
    .values({ ...env, projectId, ...changes })
    .onConflictDoUpdate({
      target: marketingSettings.environmentId,
      set: Object.keys(changes).length ? changes : { updatedAt: new Date() },
    })
    .returning();
  return toMarketingSettingsObject(row ?? null);
}
