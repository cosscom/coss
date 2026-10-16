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
  params: { display_name?: string | null; mailing_address?: string | null },
): Promise<MarketingSettingsOutput> {
  const projectId = await environmentProject(env);
  if (!projectId) throw new ContactError("not_found", "Environment not found.");
  const changes = {
    ...(params.display_name === undefined ? {} : { displayName: params.display_name }),
    ...(params.mailing_address === undefined ? {} : { mailingAddress: params.mailing_address }),
  };
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
