/**
 * The organization's senders at the provider: its subaccount, carrier registrations (US A2P
 * 10DLC: secondary customer profile → A2P trust product → brand → messaging service + campaign;
 * toll-free: messaging service + verification) and phone numbers, with their pass-through fees
 * (`sms.numbers`, `sms.registrations`; organization-wide usage, environment `""`).
 *
 * Registrations move through `step`s on the worker (`advanceDueSmsRegistrations`): every provider
 * resource is stored as soon as it exists, so a step that fails half-way runs again without
 * creating it twice, and reviews are polled (`next_check_at`) until they pass or are rejected.
 */
import { dimensionKey } from "@coss/billing/catalog";
import type { PlanGate } from "@coss/billing/gate";
import { recordUsage } from "@coss/billing/metering";
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { decryptSecret, encryptSecret, type SecretsKeyRing } from "@coss/webhooks";
import { and, asc, count, eq, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { ensureSmsAccountRow } from "./accounts.ts";
import { SmsError } from "./errors.ts";
import { parsePhoneNumber } from "./phone.ts";
import type { SmsRegistrationInputOutput } from "./schemas.ts";
import type { AvailableNumber, ReviewStatus, TwilioApi } from "./twilio/api.ts";
import { TwilioApiError, type TwilioCredentials } from "./twilio/client.ts";

const { environment, smsAccount, smsNumber, smsRegistration } = schema;

export type SmsRegistrationRow = typeof smsRegistration.$inferSelect;

export type SmsSenderDeps = {
  /** The live provider (`SMS_PROVIDER`): numbers belong to it. */
  provider: "fake" | "twilio";
  twilio: TwilioApi;
  /** Encrypts subaccount auth tokens (`WEBHOOK_SECRETS_KEY`). */
  secretsKeys: SecretsKeyRing;
  subaccountPrefix: string;
  /** `API_PUBLIC_URL`: messaging services report to `<it>/sms/twilio/*`. */
  callbackBaseUrl: string;
  /** Plan limits (`smsNumbers`). */
  plans?: PlanGate;
  /** Production without a real provider: nothing can be bought or registered. */
  provisioningDisabled?: boolean;
};

/** Usage that belongs to the organization, not to one environment. */
export const ORGANIZATION_USAGE = "";

/** How often a pending review is asked about again. */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
/** A step that failed for a reason worth retrying (Twilio unreachable) runs again this much later. */
const RETRY_MS = 10 * 60 * 1000;

/** The same day and time a month later (the 31st becomes the month's last day). */
export function oneMonthAfter(at: Date): Date {
  const next = new Date(at);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next;
}

function refuseWhenDisabled(deps: SmsSenderDeps) {
  if (deps.provisioningDisabled) {
    throw new SmsError(
      "provider_unavailable",
      "SMS senders can't be set up yet. Contact support to get started.",
    );
  }
}

/**
 * The organization's subaccount, created on first use (`<prefix>-<organization id>`), with its
 * auth token stored encrypted. Serialized per organization by the account row's lock.
 */
export async function ensureSmsSubaccount(
  organizationId: string,
  deps: SmsSenderDeps,
): Promise<TwilioCredentials> {
  await ensureSmsAccountRow(organizationId);
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select()
      .from(smsAccount)
      .where(eq(smsAccount.organizationId, organizationId))
      .for("update");
    if (!account) throw new Error("SMS account vanished.");
    if (account.status !== "active") {
      throw new SmsError("provider_unavailable", "This organization's SMS account is closed.");
    }
    if (account.subaccountSid && account.authToken && account.provider === deps.provider) {
      return {
        accountSid: account.subaccountSid,
        authToken: decryptSecret(account.authToken, deps.secretsKeys),
      };
    }
    const created = await deps.twilio.createSubaccount(
      `${deps.subaccountPrefix}-${organizationId}`,
    );
    await tx
      .update(smsAccount)
      .set({
        provider: deps.provider,
        subaccountSid: created.accountSid,
        authToken: encryptSecret(created.authToken, deps.secretsKeys),
      })
      .where(eq(smsAccount.organizationId, organizationId));
    return created;
  });
}

async function recordFee(
  tx: Executor,
  organizationId: string,
  meter: "sms.numbers" | "sms.registrations",
  dimension: Record<string, string>,
) {
  await recordUsage(tx, {
    organizationId,
    environmentId: ORGANIZATION_USAGE,
    meter,
    quantity: 1,
    dimension: dimensionKey(dimension),
  });
}

// ---------------------------------------------------------------------------------------------
// Registrations
// ---------------------------------------------------------------------------------------------

export async function listSmsRegistrations(organizationId: string): Promise<SmsRegistrationRow[]> {
  return db
    .select()
    .from(smsRegistration)
    .where(eq(smsRegistration.organizationId, organizationId))
    .orderBy(asc(smsRegistration.createdAt));
}

/**
 * Submits a registration; the worker takes it from there. An organization has at most one US
 * A2P 10DLC registration in progress or approved, and one per toll-free number.
 */
export async function createSmsRegistration(
  organizationId: string,
  input: SmsRegistrationInputOutput,
  deps: SmsSenderDeps,
): Promise<SmsRegistrationRow> {
  refuseWhenDisabled(deps);
  return db.transaction(async (tx) => {
    const active = await tx
      .select({
        id: smsRegistration.id,
        kind: smsRegistration.kind,
        numberId: smsRegistration.numberId,
      })
      .from(smsRegistration)
      .where(
        and(
          eq(smsRegistration.organizationId, organizationId),
          inArray(smsRegistration.status, ["submitted", "in_review", "approved"]),
        ),
      );
    if (input.kind === "us_10dlc" && active.some((row) => row.kind === "us_10dlc")) {
      throw new SmsError(
        "registration_locked",
        "Your organization already has a US A2P 10DLC registration in progress or approved.",
      );
    }
    let numberId: string | null = null;
    if (input.kind === "toll_free") {
      const [number] = isId("num", input.numberId)
        ? await tx
            .select()
            .from(smsNumber)
            .where(
              and(eq(smsNumber.id, input.numberId), eq(smsNumber.organizationId, organizationId)),
            )
            .limit(1)
        : [];
      if (!number || number.kind !== "toll_free") {
        throw new SmsError("registration_invalid", "Choose one of your toll-free numbers.");
      }
      if (active.some((row) => row.numberId === number.id)) {
        throw new SmsError("registration_locked", "That number is already being verified.");
      }
      numberId = number.id;
    }
    const [row] = await tx
      .insert(smsRegistration)
      .values({
        organizationId,
        kind: input.kind,
        status: "submitted",
        step: input.kind === "us_10dlc" ? "customer_profile" : "verification",
        brandType: input.kind === "us_10dlc" ? input.brandType : null,
        profile: input.profile,
        campaign: input.campaign,
        numberId,
        submittedAt: new Date(),
        nextCheckAt: new Date(),
      })
      .returning();
    if (!row) throw new Error("Registration insert returned no row.");
    if (numberId) {
      await tx
        .update(smsNumber)
        .set({ registrationId: row.id })
        .where(and(eq(smsNumber.id, numberId), eq(smsNumber.organizationId, organizationId)));
    } else {
      // The organization's local numbers send under this one once it is approved (it is the only
      // 10DLC registration in progress: earlier ones were rejected).
      await tx
        .update(smsNumber)
        .set({ registrationId: row.id })
        .where(and(eq(smsNumber.organizationId, organizationId), eq(smsNumber.kind, "local")));
    }
    return row;
  });
}

type StepOutcome =
  | { next: Partial<SmsRegistrationRow>; fees?: { fee: string }[] }
  | { rejected: string };

function reviewed(
  status: ReviewStatus,
  approved: Partial<SmsRegistrationRow>,
  now: Date,
): StepOutcome {
  if (status.status === "approved") return { next: { ...approved, nextCheckAt: now } };
  if (status.status === "rejected") {
    return { rejected: status.reason ?? "The carrier review rejected the registration." };
  }
  return { next: { nextCheckAt: new Date(now.getTime() + CHECK_INTERVAL_MS) } };
}

async function messagingService(
  row: SmsRegistrationRow,
  account: TwilioCredentials,
  deps: SmsSenderDeps,
): Promise<string> {
  if (row.messagingServiceSid) return row.messagingServiceSid;
  const base = deps.callbackBaseUrl.replace(/\/+$/, "");
  const created = await deps.twilio.createMessagingService(account, {
    friendlyName: `coss ${row.id}`,
    inboundRequestUrl: `${base}/sms/twilio/inbound`,
    statusCallback: `${base}/sms/twilio/status`,
  });
  // Stored at once: the next step must never create a second one.
  await db
    .update(smsRegistration)
    .set({ messagingServiceSid: created.sid })
    .where(
      and(eq(smsRegistration.id, row.id), eq(smsRegistration.organizationId, row.organizationId)),
    );
  return created.sid;
}

/** Adds the registration's numbers to its messaging service (once it can send). */
async function attachNumbers(
  row: SmsRegistrationRow,
  serviceSid: string,
  account: TwilioCredentials,
  deps: SmsSenderDeps,
): Promise<void> {
  const numbers = await db
    .select({ providerSid: smsNumber.providerSid })
    .from(smsNumber)
    .where(
      and(
        eq(smsNumber.organizationId, row.organizationId),
        eq(smsNumber.registrationId, row.id),
        ne(smsNumber.status, "releasing"),
        isNotNull(smsNumber.providerSid),
      ),
    );
  for (const number of numbers) {
    if (number.providerSid)
      await deps.twilio.addNumberToService(account, serviceSid, number.providerSid);
  }
}

async function runStep(
  row: SmsRegistrationRow,
  account: TwilioCredentials,
  deps: SmsSenderDeps,
  now: Date,
): Promise<StepOutcome> {
  const { twilio } = deps;
  switch (row.step) {
    case "customer_profile": {
      if (!row.customerProfileSid) {
        const created = await twilio.createCustomerProfile(account, row.profile);
        return { next: { customerProfileSid: created.sid, status: "in_review", nextCheckAt: now } };
      }
      return reviewed(
        await twilio.customerProfileStatus(account, row.customerProfileSid),
        { step: "trust_product" },
        now,
      );
    }
    case "trust_product": {
      if (!row.customerProfileSid) return { next: { step: "customer_profile", nextCheckAt: now } };
      if (!row.trustProductSid) {
        const created = await twilio.createTrustProduct(account, {
          customerProfileSid: row.customerProfileSid,
          profile: row.profile,
        });
        return { next: { trustProductSid: created.sid, nextCheckAt: now } };
      }
      return reviewed(
        await twilio.trustProductStatus(account, row.trustProductSid),
        { step: "brand" },
        now,
      );
    }
    case "brand": {
      if (!row.customerProfileSid || !row.trustProductSid) {
        return { next: { step: "customer_profile", nextCheckAt: now } };
      }
      if (!row.brandSid) {
        const lowVolume = row.brandType === "low_volume_standard";
        const created = await twilio.createBrand(account, {
          customerProfileSid: row.customerProfileSid,
          trustProductSid: row.trustProductSid,
          lowVolume,
        });
        return {
          next: { brandSid: created.sid, nextCheckAt: new Date(now.getTime() + CHECK_INTERVAL_MS) },
          fees: lowVolume ? [{ fee: "brand" }] : [{ fee: "brand" }, { fee: "brand_vetting" }],
        };
      }
      return reviewed(await twilio.brandStatus(account, row.brandSid), { step: "campaign" }, now);
    }
    case "campaign": {
      if (!row.brandSid) return { next: { step: "brand", nextCheckAt: now } };
      const serviceSid = await messagingService(row, account, deps);
      if (!row.campaignSid) {
        const created = await twilio.createCampaign(account, {
          serviceSid,
          brandSid: row.brandSid,
          campaign: row.campaign,
        });
        return {
          next: {
            messagingServiceSid: serviceSid,
            campaignSid: created.sid,
            nextCheckAt: new Date(now.getTime() + CHECK_INTERVAL_MS),
          },
          fees: [{ fee: "campaign_vetting" }],
        };
      }
      const status = await twilio.campaignStatus(account, {
        serviceSid,
        campaignSid: row.campaignSid,
      });
      if (status.status === "approved") await attachNumbers(row, serviceSid, account, deps);
      return reviewed(status, { step: "done" }, now);
    }
    case "verification": {
      const [number] = row.numberId
        ? await db
            .select()
            .from(smsNumber)
            .where(
              and(eq(smsNumber.id, row.numberId), eq(smsNumber.organizationId, row.organizationId)),
            )
            .limit(1)
        : [];
      if (!number?.providerSid) return { rejected: "The toll-free number was released." };
      const serviceSid = await messagingService(row, account, deps);
      if (!row.tollFreeVerificationSid) {
        await twilio.addNumberToService(account, serviceSid, number.providerSid);
        const created = await twilio.createTollFreeVerification(account, {
          numberSid: number.providerSid,
          profile: row.profile,
          campaign: row.campaign,
        });
        return {
          next: {
            messagingServiceSid: serviceSid,
            tollFreeVerificationSid: created.sid,
            status: "in_review",
            nextCheckAt: new Date(now.getTime() + CHECK_INTERVAL_MS),
          },
        };
      }
      return reviewed(
        await twilio.tollFreeVerificationStatus(account, row.tollFreeVerificationSid),
        { step: "done" },
        now,
      );
    }
    default:
      return { next: { nextCheckAt: null } };
  }
}

/**
 * Takes one registration a step further. Claims it by moving `next_check_at` out first (a
 * compare-and-set), so concurrent workers never run the same step.
 */
export async function advanceSmsRegistration(
  row: SmsRegistrationRow,
  deps: SmsSenderDeps,
  now: Date = new Date(),
): Promise<SmsRegistrationRow | null> {
  const [claimed] = await db
    .update(smsRegistration)
    .set({ nextCheckAt: new Date(now.getTime() + RETRY_MS) })
    .where(
      and(
        eq(smsRegistration.id, row.id),
        eq(smsRegistration.organizationId, row.organizationId),
        row.nextCheckAt
          ? eq(smsRegistration.nextCheckAt, row.nextCheckAt)
          : isNull(smsRegistration.nextCheckAt),
        inArray(smsRegistration.status, ["submitted", "in_review"]),
      ),
    )
    .returning();
  if (!claimed) return null;
  let outcome: StepOutcome;
  try {
    const account = await ensureSmsSubaccount(claimed.organizationId, deps);
    outcome = await runStep(claimed, account, deps, now);
  } catch (error) {
    if (
      error instanceof TwilioApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429
    ) {
      // Twilio refused what the business entered: the customer must fix it and register again.
      outcome = { rejected: error.message };
    } else {
      console.error(`[sms] registration ${claimed.id} step ${claimed.step} failed:`, error);
      return claimed;
    }
  }
  return db.transaction(async (tx) => {
    if ("rejected" in outcome) {
      const [rejected] = await tx
        .update(smsRegistration)
        .set({
          status: "rejected",
          rejectionReason: outcome.rejected.slice(0, 1000),
          nextCheckAt: null,
        })
        .where(
          and(
            eq(smsRegistration.id, claimed.id),
            eq(smsRegistration.organizationId, claimed.organizationId),
          ),
        )
        .returning();
      return rejected ?? null;
    }
    const done = outcome.next.step === "done";
    for (const fee of outcome.fees ?? []) {
      await recordFee(tx, claimed.organizationId, "sms.registrations", fee);
    }
    const monthly =
      claimed.brandType === "low_volume_standard"
        ? "campaign_monthly_low_volume"
        : "campaign_monthly";
    if (done && claimed.kind === "us_10dlc") {
      // The campaign's first month, then every month (`chargeDueSmsFees`).
      await recordFee(tx, claimed.organizationId, "sms.registrations", { fee: monthly });
    }
    const [updated] = await tx
      .update(smsRegistration)
      .set({
        ...outcome.next,
        ...(done
          ? {
              status: "approved" as const,
              approvedAt: now,
              nextCheckAt: null,
              nextFeeAt: claimed.kind === "us_10dlc" ? oneMonthAfter(now) : null,
            }
          : {}),
      })
      .where(
        and(
          eq(smsRegistration.id, claimed.id),
          eq(smsRegistration.organizationId, claimed.organizationId),
        ),
      )
      .returning();
    return updated ?? null;
  });
}

/** The worker's `sms-registrations` loop: every registration whose next check is due. */
export async function advanceDueSmsRegistrations(
  deps: SmsSenderDeps,
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select()
    .from(smsRegistration)
    .where(
      and(
        lte(smsRegistration.nextCheckAt, now),
        inArray(smsRegistration.status, ["submitted", "in_review"]),
        opts.scope
          ? inArray(smsRegistration.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(smsRegistration.nextCheckAt))
    .limit(opts.limit ?? 20);
  for (const row of due) await advanceSmsRegistration(row, deps, now);
  return due.length;
}

// ---------------------------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------------------------

/** Numbers the organization could buy (local by area code, or toll-free), in the US or Canada. */
export async function searchSmsNumbers(
  organizationId: string,
  input: { kind: "local" | "toll_free"; country: "US" | "CA"; areaCode?: string },
  deps: SmsSenderDeps,
): Promise<AvailableNumber[]> {
  refuseWhenDisabled(deps);
  const account = await ensureSmsSubaccount(organizationId, deps);
  return deps.twilio.searchNumbers(account, { ...input, limit: 10 });
}

/**
 * Buys a number into the organization's subaccount (within the plan's `smsNumbers`), charges its
 * first month, and — when the registration it sends under is already approved — adds it to that
 * registration's messaging service. Replies go to `receivingEnvironmentId` (a live environment).
 */
export async function buySmsNumber(
  organizationId: string,
  input: {
    phoneNumber: string;
    kind: "local" | "toll_free";
    receivingEnvironmentId?: string | null;
  },
  deps: SmsSenderDeps,
): Promise<typeof smsNumber.$inferSelect> {
  refuseWhenDisabled(deps);
  const parsed = parsePhoneNumber(input.phoneNumber);
  if (!parsed) throw new SmsError("invalid_phone_number", "That isn't a valid phone number.");
  if (input.receivingEnvironmentId) {
    await requireLiveEnvironment(organizationId, input.receivingEnvironmentId);
  }
  const [held] = await db
    .select({ n: count() })
    .from(smsNumber)
    .where(eq(smsNumber.organizationId, organizationId));
  await deps.plans?.requireCapacity(organizationId, "smsNumbers", held?.n ?? 0);
  const account = await ensureSmsSubaccount(organizationId, deps);
  let bought: { sid: string; phoneNumber: string };
  try {
    bought = await deps.twilio.buyNumber(account, { phoneNumber: parsed.phoneNumber });
  } catch (error) {
    if (error instanceof TwilioApiError && error.status < 500) {
      throw new SmsError("number_unavailable", "That number is no longer available. Search again.");
    }
    throw error;
  }
  const now = new Date();
  const registration =
    input.kind === "local"
      ? (
          await db
            .select()
            .from(smsRegistration)
            .where(
              and(
                eq(smsRegistration.organizationId, organizationId),
                eq(smsRegistration.kind, "us_10dlc"),
                inArray(smsRegistration.status, ["submitted", "in_review", "approved"]),
              ),
            )
            .limit(1)
        )[0]
      : undefined;
  const row = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(smsNumber)
      .values({
        organizationId,
        phoneNumber: bought.phoneNumber,
        kind: input.kind,
        country: parsed.country,
        provider: deps.provider,
        providerSid: bought.sid,
        status: "active",
        registrationId: registration?.id ?? null,
        receivingEnvironmentId: input.receivingEnvironmentId ?? null,
        nextFeeAt: oneMonthAfter(now),
      })
      .returning();
    if (!inserted) throw new Error("Number insert returned no row.");
    await recordFee(tx, organizationId, "sms.numbers", { type: input.kind });
    return inserted;
  });
  if (registration?.status === "approved" && registration.messagingServiceSid) {
    await deps.twilio.addNumberToService(account, registration.messagingServiceSid, bought.sid);
  }
  return row;
}

async function requireLiveEnvironment(organizationId: string, environmentId: string) {
  const [env] = await db
    .select({ id: environment.id })
    .from(environment)
    .where(
      and(
        eq(environment.id, environmentId),
        eq(environment.organizationId, organizationId),
        eq(environment.mode, "live"),
      ),
    )
    .limit(1);
  if (!env) {
    throw new SmsError("registration_invalid", "Replies can only go to a live environment.");
  }
}

/** Where a number's replies go (`null`: dropped; opt-outs still apply). */
export async function setSmsNumberReceivingEnvironment(
  organizationId: string,
  numberId: string,
  environmentId: string | null,
): Promise<void> {
  if (environmentId) await requireLiveEnvironment(organizationId, environmentId);
  const updated = await db
    .update(smsNumber)
    .set({ receivingEnvironmentId: environmentId })
    .where(and(eq(smsNumber.id, numberId), eq(smsNumber.organizationId, organizationId)))
    .returning({ id: smsNumber.id });
  if (updated.length === 0) throw new SmsError("not_found", "Number not found.");
}

/** Releases a number: it stops sending at once, then goes back to the provider. */
export async function releaseSmsNumber(
  organizationId: string,
  numberId: string,
  deps: SmsSenderDeps,
): Promise<void> {
  const [number] = await db
    .update(smsNumber)
    .set({ status: "releasing" })
    .where(and(eq(smsNumber.id, numberId), eq(smsNumber.organizationId, organizationId)))
    .returning();
  if (!number) throw new SmsError("not_found", "Number not found.");
  if (number.providerSid && number.provider === deps.provider) {
    const account = await ensureSmsSubaccount(organizationId, deps);
    try {
      await deps.twilio.releaseNumber(account, number.providerSid);
    } catch (error) {
      // Already gone at the provider: nothing left to release.
      if (!(error instanceof TwilioApiError && error.status === 404)) throw error;
    }
  }
  await db
    .delete(smsNumber)
    .where(and(eq(smsNumber.id, number.id), eq(smsNumber.organizationId, organizationId)));
}

// ---------------------------------------------------------------------------------------------
// Fees and teardown
// ---------------------------------------------------------------------------------------------

/**
 * The worker's `sms-fees` loop: a month of each number held, and of each approved US campaign,
 * every month from when it started. Each charge moves `next_fee_at` on in its transaction.
 */
export async function chargeDueSmsFees(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 100;
  const scoped = (
    column: typeof smsNumber.organizationId | typeof smsRegistration.organizationId,
  ) => (opts.scope ? inArray(column, opts.scope.organizationIds) : undefined);
  const numbers = await db
    .select()
    .from(smsNumber)
    .where(
      and(
        lte(smsNumber.nextFeeAt, now),
        ne(smsNumber.status, "releasing"),
        scoped(smsNumber.organizationId),
      ),
    )
    .limit(limit);
  for (const number of numbers) {
    await db.transaction(async (tx) => {
      const [moved] = await tx
        .update(smsNumber)
        .set({ nextFeeAt: oneMonthAfter(number.nextFeeAt ?? now) })
        .where(
          and(
            eq(smsNumber.id, number.id),
            eq(smsNumber.organizationId, number.organizationId),
            number.nextFeeAt ? eq(smsNumber.nextFeeAt, number.nextFeeAt) : undefined,
          ),
        )
        .returning({ id: smsNumber.id });
      if (moved) await recordFee(tx, number.organizationId, "sms.numbers", { type: number.kind });
    });
  }
  const campaigns = await db
    .select()
    .from(smsRegistration)
    .where(
      and(
        lte(smsRegistration.nextFeeAt, now),
        eq(smsRegistration.status, "approved"),
        scoped(smsRegistration.organizationId),
      ),
    )
    .limit(limit);
  for (const campaign of campaigns) {
    await db.transaction(async (tx) => {
      const [moved] = await tx
        .update(smsRegistration)
        .set({ nextFeeAt: oneMonthAfter(campaign.nextFeeAt ?? now) })
        .where(
          and(
            eq(smsRegistration.id, campaign.id),
            eq(smsRegistration.organizationId, campaign.organizationId),
            campaign.nextFeeAt ? eq(smsRegistration.nextFeeAt, campaign.nextFeeAt) : undefined,
          ),
        )
        .returning({ id: smsRegistration.id });
      if (moved) {
        await recordFee(tx, campaign.organizationId, "sms.registrations", {
          fee:
            campaign.brandType === "low_volume_standard"
              ? "campaign_monthly_low_volume"
              : "campaign_monthly",
        });
      }
    });
  }
  return numbers.length + campaigns.length;
}

/**
 * Organization deletion (`releaseProviderResources`): numbers stop sending, the subaccount is
 * closed (Twilio releases its numbers and messaging services with it), the rows go. Idempotent.
 */
export async function releaseOrganizationSmsResources(
  organizationId: string,
  deps: Pick<SmsSenderDeps, "twilio" | "provider">,
  assertLease: () => Promise<void> = async () => {},
): Promise<void> {
  await db
    .update(smsNumber)
    .set({ status: "releasing" })
    .where(eq(smsNumber.organizationId, organizationId));
  const [account] = await db
    .select()
    .from(smsAccount)
    .where(eq(smsAccount.organizationId, organizationId))
    .limit(1);
  await assertLease();
  if (account?.subaccountSid && account.status !== "closed" && account.provider === deps.provider) {
    await db
      .update(smsAccount)
      .set({ status: "closing" })
      .where(eq(smsAccount.organizationId, organizationId));
    await deps.twilio.closeSubaccount(account.subaccountSid);
  }
  await assertLease();
  await db
    .update(smsRegistration)
    .set({ nextCheckAt: null, nextFeeAt: null })
    .where(
      and(
        eq(smsRegistration.organizationId, organizationId),
        or(isNotNull(smsRegistration.nextCheckAt), isNotNull(smsRegistration.nextFeeAt)),
      ),
    );
  await db.delete(smsNumber).where(eq(smsNumber.organizationId, organizationId));
  if (account) {
    await db
      .update(smsAccount)
      .set({ status: "closed" })
      .where(eq(smsAccount.organizationId, organizationId));
  }
}
