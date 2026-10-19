/**
 * An organization's SMS account (`sms_account`): its allowed destination countries and, once it
 * registers senders, its provider subaccount. The row is created on first use.
 */
import { db, type Executor, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { DEFAULT_SMS_COUNTRIES, isHighRiskSmsCountry } from "./countries.ts";
import { SmsError } from "./errors.ts";

const { smsAccount } = schema;

export type SmsAccountRow = typeof smsAccount.$inferSelect;

/** The organization's account, or the defaults it would start with. */
export async function getSmsAccount(
  organizationId: string,
  executor: Executor = db,
): Promise<SmsAccountRow | null> {
  const [row] = await executor
    .select()
    .from(smsAccount)
    .where(eq(smsAccount.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

/** The account row, created with the defaults if it doesn't exist yet. */
export async function ensureSmsAccountRow(
  organizationId: string,
  executor: Executor = db,
): Promise<SmsAccountRow> {
  await executor.insert(smsAccount).values({ organizationId }).onConflictDoNothing();
  const row = await getSmsAccount(organizationId, executor);
  if (!row) throw new Error("SMS account vanished after its insert.");
  return row;
}

export function allowedCountries(account: SmsAccountRow | null): readonly string[] {
  return account?.allowedCountries ?? DEFAULT_SMS_COUNTRIES;
}

const COUNTRY = /^[A-Z]{2}$/;

/**
 * Replaces the countries live sends may go to (owners and admins). A high-risk country can only be
 * allowed once a platform admin unlocked it for the organization.
 */
export async function setAllowedSmsCountries(
  organizationId: string,
  countries: readonly string[],
): Promise<SmsAccountRow> {
  const wanted = [...new Set(countries.map((country) => country.trim().toUpperCase()))].sort();
  const invalid = wanted.find((country) => !COUNTRY.test(country));
  if (invalid) throw new SmsError("country_not_allowed", `"${invalid}" isn't a country code.`);
  return db.transaction(async (tx) => {
    const account = await ensureSmsAccountRow(organizationId, tx);
    const locked = wanted.find(
      (country) => isHighRiskSmsCountry(country) && !account.unlockedCountries.includes(country),
    );
    if (locked) {
      throw new SmsError(
        "country_not_allowed",
        `${locked} is a frequent target of SMS fraud. Contact support to allow it.`,
      );
    }
    const [row] = await tx
      .update(smsAccount)
      .set({ allowedCountries: wanted })
      .where(eq(smsAccount.organizationId, organizationId))
      .returning();
    if (!row) throw new Error("SMS account vanished during its update.");
    return row;
  });
}

/** Platform admins: high-risk countries the organization may allow (audited by the caller). */
export async function setUnlockedSmsCountries(
  organizationId: string,
  countries: readonly string[],
  executor: Executor = db,
): Promise<SmsAccountRow> {
  const unlocked = [...new Set(countries.map((country) => country.toUpperCase()))]
    .filter((country) => COUNTRY.test(country))
    .sort();
  await ensureSmsAccountRow(organizationId, executor);
  const [row] = await executor
    .update(smsAccount)
    .set({ unlockedCountries: unlocked })
    .where(eq(smsAccount.organizationId, organizationId))
    .returning();
  if (!row) throw new Error("SMS account vanished during its update.");
  // Countries no longer unlocked can't stay allowed.
  const stillAllowed = row.allowedCountries.filter(
    (country) => !isHighRiskSmsCountry(country) || unlocked.includes(country),
  );
  if (stillAllowed.length === row.allowedCountries.length) return row;
  const [updated] = await executor
    .update(smsAccount)
    .set({ allowedCountries: stillAllowed })
    .where(eq(smsAccount.organizationId, organizationId))
    .returning();
  return updated ?? row;
}
