// The organization's SMS page (apps/web/src/app/[orgSlug]/sms/page.tsx) on the wire: numbers,
// registrations (the business's legal name only: never its tax id, contact or provider sids) and
// countries.
import { RATE_CARDS, rateCardAt } from "@coss/billing/catalog";
import { formatUnitPrice } from "@coss/billing/money";
import type {
  MobileSmsCountry,
  MobileSmsNumber,
  MobileSmsRegistration,
  SmsSendersResponse,
} from "@coss/companion";
import {
  allowedCountries,
  HIGH_RISK_SMS_COUNTRIES,
  type SmsAccountRow,
  type SmsNumberWithRegistration,
  type SmsRegistrationRow,
} from "@coss/sms";

const REGIONS = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  try {
    return REGIONS.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries with a list price now (or from the next card, if it is already published). */
function pricedCountries(now: Date): { code: string; price: string }[] {
  const current = rateCardAt(now);
  const latest = RATE_CARDS.at(-1) ?? current;
  const byDimension = {
    ...current.rates["sms.segments"]?.byDimension,
    ...latest.rates["sms.segments"]?.byDimension,
  };
  return Object.entries(byDimension).flatMap(([dimension, rate]) => {
    const [tier] = rate.tiers;
    return tier
      ? [
          {
            code: dimension.slice(dimension.indexOf("=") + 1),
            price: formatUnitPrice(tier.unitNanos),
          },
        ]
      : [];
  });
}

export function toMobileSmsCountries(
  account: SmsAccountRow | null,
  now: Date = new Date(),
): MobileSmsCountry[] {
  const allowed = allowedCountries(account);
  const unlocked = account?.unlockedCountries ?? [];
  return pricedCountries(now)
    .map(({ code, price }) => ({
      code,
      name: countryName(code),
      price,
      allowed: allowed.includes(code),
      locked: HIGH_RISK_SMS_COUNTRIES.includes(code) && !unlocked.includes(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** "Project / Environment" of each live environment (where a number's replies can go). */
export function liveEnvironmentLabels(
  projects: {
    project: { name: string };
    environments: { id: string; name: string; mode: string }[];
  }[],
): Map<string, string> {
  return new Map(
    projects.flatMap(({ project, environments }) =>
      environments
        .filter((environment) => environment.mode === "live")
        .map((environment) => [environment.id, `${project.name} / ${environment.name}`] as const),
    ),
  );
}

export function toMobileSmsNumber(
  row: SmsNumberWithRegistration & { canSend: boolean },
  environmentLabels: Map<string, string>,
): MobileSmsNumber {
  const { number } = row;
  return {
    id: number.id,
    phone_number: number.phoneNumber,
    kind: number.kind,
    sending: row.canSend
      ? "can_send"
      : number.status === "pending"
        ? "setting_up"
        : (row.registration?.status ?? "not_registered"),
    replies_to: environmentLabels.get(number.receivingEnvironmentId ?? "") ?? null,
  };
}

export function toMobileSmsRegistration(row: SmsRegistrationRow): MobileSmsRegistration {
  return {
    id: row.id,
    kind: row.kind,
    business: row.profile.legalName,
    status: row.status,
    rejection_reason: row.rejectionReason,
    submitted_at: row.submittedAt?.toISOString() ?? null,
  };
}

/** The page's alert: SMS senders unavailable, or local numbers without a 10DLC registration. */
export function smsSendersNotice(input: {
  enabled: boolean;
  numbers: SmsNumberWithRegistration[];
  registrations: SmsRegistrationRow[];
}): SmsSendersResponse["notice"] {
  if (!input.enabled) return "unavailable";
  const tenDlc = input.registrations.find(
    (row) => row.kind === "us_10dlc" && row.status !== "rejected" && row.status !== "failed",
  );
  return !tenDlc && input.numbers.some((row) => row.number.kind === "local")
    ? "register_10dlc"
    : null;
}
