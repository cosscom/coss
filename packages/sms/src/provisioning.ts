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
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  notInArray,
  or,
} from "drizzle-orm";
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
  /**
   * Plan limits (`smsNumbers`): required to register senders or buy numbers, which cost money at
   * the provider from the first step. The worker, which does neither, leaves it out.
   */
  plans?: PlanGate;
  /** Production without a real provider: nothing can be bought or registered. */
  provisioningDisabled?: boolean;
};

/** Usage that belongs to the organization, not to one environment. */
export const ORGANIZATION_USAGE = "";

/** Twilio's answers to what a business entered (validation), as opposed to coss.com's setup. */
const CUSTOMER_ERRORS: ReadonlySet<number> = new Set([400, 422]);

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

function plansOf(deps: SmsSenderDeps): PlanGate {
  if (!deps.plans) throw new Error("SmsSenderDeps.plans is required to set up senders.");
  return deps.plans;
}

/** Plans without SMS numbers (Free) can't run up provider fees with senders either. */
async function requireSmsPlan(organizationId: string, deps: SmsSenderDeps) {
  if ((await plansOf(deps).limit(organizationId, "smsNumbers")) === 0) {
    throw new SmsError(
      "plan_required",
      "SMS senders need a paid plan. Upgrade your plan to register one or buy numbers.",
    );
  }
}

/** Serializes an organization's sender changes (registrations, purchases) in `tx`. */
async function lockSmsAccount(tx: Executor, organizationId: string) {
  await tx
    .select({ organizationId: smsAccount.organizationId })
    .from(smsAccount)
    .where(eq(smsAccount.organizationId, organizationId))
    .for("update");
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
    if (account.subaccountSid && account.provider !== "fake") {
      // A real subaccount this deployment's provider can't use: replacing it would orphan it.
      throw new SmsError("provider_unavailable", "SMS senders can't be changed right now.");
    }
    // An earlier attempt may have created it and lost the answer (or crashed before storing it).
    const name = `${deps.subaccountPrefix}-${organizationId}`;
    const created =
      (await deps.twilio.findSubaccount(name)) ?? (await deps.twilio.createSubaccount(name));
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
  await requireSmsPlan(organizationId, deps);
  await ensureSmsAccountRow(organizationId);
  return db.transaction(async (tx) => {
    // Two submissions at once must not both find nothing in progress.
    await lockSmsAccount(tx, organizationId);
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
  | {
      next: Partial<SmsRegistrationRow>;
      fees?: { fee: string }[];
      /** Numbers added to the messaging service before an approval (the rest wait, pending). */
      attached?: string[];
    }
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
  const friendlyName = `coss ${row.id}`;
  const existing = await deps.twilio.findMessagingService(account, friendlyName);
  const created = existing
    ? { sid: existing }
    : await deps.twilio.createMessagingService(account, {
        friendlyName,
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

/** Adds the registration's numbers to its messaging service (once it can send); their ids. */
async function attachNumbers(
  row: SmsRegistrationRow,
  serviceSid: string,
  account: TwilioCredentials,
  deps: SmsSenderDeps,
): Promise<string[]> {
  const numbers = await db
    .select({ id: smsNumber.id, providerSid: smsNumber.providerSid })
    .from(smsNumber)
    .where(
      and(
        eq(smsNumber.organizationId, row.organizationId),
        eq(smsNumber.registrationId, row.id),
        ne(smsNumber.status, "releasing"),
        isNotNull(smsNumber.providerSid),
      ),
    );
  const attached: string[] = [];
  for (const number of numbers) {
    if (!number.providerSid) continue;
    await addToService(account, serviceSid, number.providerSid, deps);
    attached.push(number.id);
  }
  return attached;
}

/** Twilio's "already in this messaging service": a retry after an attachment that did happen. */
const ALREADY_IN_SERVICE = "21710";

async function addToService(
  account: TwilioCredentials,
  serviceSid: string,
  numberSid: string,
  deps: SmsSenderDeps,
): Promise<void> {
  try {
    await deps.twilio.addNumberToService(account, serviceSid, numberSid);
  } catch (error) {
    if (!(error instanceof TwilioApiError && error.code === ALREADY_IN_SERVICE)) throw error;
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
        // A brand an earlier attempt created (its answer lost) is adopted, never paid for twice.
        const existing = await twilio.findBrand(account, row.customerProfileSid);
        const created = existing
          ? { sid: existing }
          : await twilio.createBrand(account, {
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
        const existing = await twilio.findCampaign(account, serviceSid);
        const created = existing
          ? { sid: existing }
          : await twilio.createCampaign(account, {
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
      const attached =
        status.status === "approved" ? await attachNumbers(row, serviceSid, account, deps) : [];
      const outcome = reviewed(status, { step: "done" }, now);
      return "next" in outcome ? { ...outcome, attached } : outcome;
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
        await addToService(account, serviceSid, number.providerSid, deps);
        // A verification an earlier attempt submitted (its answer lost) is followed, not repeated.
        const existing = await twilio.findTollFreeVerification(account, number.providerSid);
        const created = existing
          ? { sid: existing }
          : await twilio.createTollFreeVerification(account, {
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
    if (error instanceof TwilioApiError && CUSTOMER_ERRORS.has(error.status)) {
      // Twilio refused what the business entered: the customer must fix it and register again.
      // Anything else (credentials, permissions, Twilio down) is coss.com's to fix: retried.
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
    if (done && claimed.kind === "us_10dlc") {
      // Purchases read the registration's status under the account lock: one that committed
      // after the numbers were attached above stored its number `active` but outside the
      // service. Those wait, `pending`, for `attachPendingSmsNumbers`.
      await lockSmsAccount(tx, claimed.organizationId);
      await tx
        .update(smsNumber)
        .set({ status: "pending" })
        .where(
          and(
            eq(smsNumber.organizationId, claimed.organizationId),
            eq(smsNumber.registrationId, claimed.id),
            eq(smsNumber.status, "active"),
            outcome.attached?.length ? notInArray(smsNumber.id, outcome.attached) : undefined,
          ),
        );
    }
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

/** US and Canadian toll-free area codes (NANP: 800, 833, 844, 855, 866, 877, 888). */
const TOLL_FREE = /^\+18(00|33|44|55|66|77|88)\d{7}$/;

export function smsNumberKind(phoneNumber: string): "local" | "toll_free" {
  return TOLL_FREE.test(phoneNumber) ? "toll_free" : "local";
}

/**
 * Buys a number into the organization's subaccount (within the plan's `smsNumbers`) and charges
 * its first month. A local number bought once the US registration is approved is `pending` until
 * it is in that registration's messaging service (here, else `attachPendingSmsNumbers`); every
 * other number is `active` and joins its service when its registration is approved. Replies go
 * to `receivingEnvironmentId` (a live environment).
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
  // Billed and registered by what the number is, never by what the form said.
  const kind = smsNumberKind(parsed.phoneNumber);
  if (kind !== input.kind) {
    throw new SmsError(
      "number_unavailable",
      `That is a ${kind === "toll_free" ? "toll-free" : "local"} number. Search again.`,
    );
  }
  if (input.receivingEnvironmentId) {
    await requireLiveEnvironment(organizationId, input.receivingEnvironmentId);
  }
  await requireSmsPlan(organizationId, deps);
  const account = await ensureSmsSubaccount(organizationId, deps);
  // The purchase is stored as an intent (`pending`, no provider sid) before Twilio is asked, so
  // one whose answer is lost, or whose recording fails, is found again (`reconcileSmsPurchases`)
  // instead of being orphaned at Twilio. Intents count against the plan's limit: two purchases at
  // once can't both fit under it.
  const intent = await db.transaction(async (tx) => {
    await lockSmsAccount(tx, organizationId);
    const [held] = await tx
      .select({ n: count() })
      .from(smsNumber)
      .where(eq(smsNumber.organizationId, organizationId));
    await plansOf(deps).requireCapacity(organizationId, "smsNumbers", held?.n ?? 0);
    const [inserted] = await tx
      .insert(smsNumber)
      .values({
        organizationId,
        phoneNumber: parsed.phoneNumber,
        kind,
        country: parsed.country,
        provider: deps.provider,
        status: "pending",
        receivingEnvironmentId: input.receivingEnvironmentId ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (!inserted) {
      throw new SmsError("number_unavailable", "That number is already taken. Search again.");
    }
    return inserted;
  });
  let bought: { sid: string; phoneNumber: string };
  try {
    bought =
      (await deps.twilio.findNumber(account, parsed.phoneNumber)) ??
      (await deps.twilio.buyNumber(account, { phoneNumber: parsed.phoneNumber }));
  } catch (error) {
    if (error instanceof TwilioApiError && error.status < 500) {
      await dropPurchaseIntent(intent);
      throw new SmsError("number_unavailable", "That number is no longer available. Search again.");
    }
    // Twilio may have bought it: the worker finds out and finishes or drops the purchase.
    throw error;
  }
  const completed = await completePurchase(intent, bought);
  if (!completed) return (await numberById(intent)) ?? intent;
  const { row, attachTo } = completed;
  if (!attachTo) return row;
  try {
    return (await attachSmsNumber(row, attachTo, account, deps)) ?? row;
  } catch (error) {
    // Bought and billed: the worker attaches it later (`attachPendingSmsNumbers`).
    console.error(`[sms] number ${row.id} not added to its messaging service yet:`, error);
    return row;
  }
}

type SmsNumberRow = typeof smsNumber.$inferSelect;

async function numberById(number: SmsNumberRow): Promise<SmsNumberRow | undefined> {
  const [row] = await db
    .select()
    .from(smsNumber)
    .where(and(eq(smsNumber.id, number.id), eq(smsNumber.organizationId, number.organizationId)));
  return row;
}

async function dropPurchaseIntent(intent: SmsNumberRow): Promise<void> {
  await db
    .delete(smsNumber)
    .where(
      and(
        eq(smsNumber.id, intent.id),
        eq(smsNumber.organizationId, intent.organizationId),
        eq(smsNumber.status, "pending"),
        isNull(smsNumber.providerSid),
      ),
    );
}

/**
 * Records a purchase Twilio made: its sid, its first month's fee, and the registration it sends
 * under. Under the account lock, like an approval: a local number bought once the US registration
 * is approved stays `pending` until it is in its messaging service. `null` when another process
 * already recorded it.
 */
async function completePurchase(
  intent: SmsNumberRow,
  bought: { sid: string; phoneNumber: string },
): Promise<{ row: SmsNumberRow; attachTo: string | null } | null> {
  return db.transaction(async (tx) => {
    await lockSmsAccount(tx, intent.organizationId);
    const [registration] =
      intent.kind === "local"
        ? await tx
            .select()
            .from(smsRegistration)
            .where(
              and(
                eq(smsRegistration.organizationId, intent.organizationId),
                eq(smsRegistration.kind, "us_10dlc"),
                inArray(smsRegistration.status, ["submitted", "in_review", "approved"]),
              ),
            )
            .limit(1)
        : [];
    const attachTo = registration?.status === "approved" ? registration.messagingServiceSid : null;
    const [row] = await tx
      .update(smsNumber)
      .set({
        providerSid: bought.sid,
        status: attachTo ? "pending" : "active",
        registrationId: registration?.id ?? null,
        nextFeeAt: oneMonthAfter(new Date()),
      })
      .where(
        and(
          eq(smsNumber.id, intent.id),
          eq(smsNumber.organizationId, intent.organizationId),
          eq(smsNumber.status, "pending"),
          isNull(smsNumber.providerSid),
        ),
      )
      .returning();
    if (!row) return null;
    await recordFee(tx, intent.organizationId, "sms.numbers", { type: intent.kind });
    return { row, attachTo };
  });
}

/** How long a purchase may stay unanswered before the worker asks Twilio what happened. */
const PURCHASE_RECONCILE_MS = 2 * 60 * 1000;
/** A purchase Twilio still doesn't know about this long after is dropped. */
const PURCHASE_ABANDON_MS = 30 * 60 * 1000;

/**
 * The worker's `sms-registrations` loop: purchases whose outcome was never recorded (Twilio's
 * answer lost, or recording it failed). A number the subaccount owns is recorded and billed; an
 * intent Twilio still doesn't know half an hour on is dropped.
 */
export async function reconcileSmsPurchases(
  deps: SmsSenderDeps,
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select()
    .from(smsNumber)
    .where(
      and(
        eq(smsNumber.status, "pending"),
        isNull(smsNumber.providerSid),
        eq(smsNumber.provider, deps.provider),
        lte(smsNumber.createdAt, new Date(now.getTime() - PURCHASE_RECONCILE_MS)),
        opts.scope ? inArray(smsNumber.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(smsNumber.createdAt))
    .limit(opts.limit ?? 20);
  let settled = 0;
  for (const intent of due) {
    try {
      const account = await ensureSmsSubaccount(intent.organizationId, deps);
      const owned = await deps.twilio.findNumber(account, intent.phoneNumber);
      if (owned) {
        await completePurchase(intent, owned);
        settled++;
      } else if (intent.createdAt.getTime() <= now.getTime() - PURCHASE_ABANDON_MS) {
        await dropPurchaseIntent(intent);
        settled++;
      }
    } catch (error) {
      console.error(`[sms] purchase of ${intent.id} not reconciled:`, error);
    }
  }
  return settled;
}

async function attachSmsNumber(
  number: typeof smsNumber.$inferSelect,
  serviceSid: string,
  account: TwilioCredentials,
  deps: SmsSenderDeps,
) {
  if (!number.providerSid) return null;
  await addToService(account, serviceSid, number.providerSid, deps);
  const [updated] = await db
    .update(smsNumber)
    .set({ status: "active" })
    .where(
      and(
        eq(smsNumber.id, number.id),
        eq(smsNumber.organizationId, number.organizationId),
        eq(smsNumber.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}

/**
 * The worker's `sms-registrations` loop: numbers still `pending` a minute after their purchase
 * (adding them to their registration's messaging service failed) are added again.
 */
export async function attachPendingSmsNumbers(
  deps: SmsSenderDeps,
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select({ number: smsNumber, serviceSid: smsRegistration.messagingServiceSid })
    .from(smsNumber)
    .innerJoin(
      smsRegistration,
      and(
        eq(smsRegistration.id, smsNumber.registrationId),
        eq(smsRegistration.organizationId, smsNumber.organizationId),
      ),
    )
    .where(
      and(
        eq(smsNumber.status, "pending"),
        isNotNull(smsNumber.providerSid),
        eq(smsNumber.provider, deps.provider),
        lte(smsNumber.createdAt, new Date(now.getTime() - 60_000)),
        eq(smsRegistration.status, "approved"),
        isNotNull(smsRegistration.messagingServiceSid),
        opts.scope ? inArray(smsNumber.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(smsNumber.createdAt))
    .limit(opts.limit ?? 20);
  let attached = 0;
  for (const { number, serviceSid } of due) {
    if (!serviceSid) continue;
    try {
      const account = await ensureSmsSubaccount(number.organizationId, deps);
      if (await attachSmsNumber(number, serviceSid, account, deps)) attached++;
    } catch (error) {
      console.error(`[sms] number ${number.id} still not in its messaging service:`, error);
    }
  }
  return attached;
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

/**
 * Releases a number: it stops sending at once (`releasing`), then goes back to the provider. A
 * release the provider didn't finish is retried by `retryUnfinishedSmsReleases`.
 */
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
  await finishRelease(number, deps);
}

/** A number at a real provider this deployment isn't configured for can't be released yet. */
function releasable(number: typeof smsNumber.$inferSelect, deps: SmsSenderDeps): boolean {
  return number.provider === deps.provider || number.provider === "fake";
}

async function finishRelease(number: typeof smsNumber.$inferSelect, deps: SmsSenderDeps) {
  if (!releasable(number, deps)) {
    // Kept `releasing` (it never sends again) until a deployment with its provider releases it.
    throw new SmsError(
      "provider_unavailable",
      "This number can't be released right now. It no longer sends; try again later.",
    );
  }
  if (number.provider === deps.provider) {
    const account = await ensureSmsSubaccount(number.organizationId, deps);
    // A purchase whose outcome was never recorded may still have bought the number.
    const providerSid =
      number.providerSid ?? (await deps.twilio.findNumber(account, number.phoneNumber))?.sid;
    try {
      if (providerSid) await deps.twilio.releaseNumber(account, providerSid);
    } catch (error) {
      // Already gone at the provider: nothing left to release.
      if (!(error instanceof TwilioApiError && error.status === 404)) throw error;
    }
  }
  await db
    .delete(smsNumber)
    .where(
      and(
        eq(smsNumber.id, number.id),
        eq(smsNumber.organizationId, number.organizationId),
        eq(smsNumber.status, "releasing"),
      ),
    );
}

/** How long a release may take before the worker finishes it. */
const RELEASE_RETRY_MS = 10 * 60 * 1000;

/**
 * The worker's `sms-registrations` loop: numbers still `releasing` 10 minutes on (the provider
 * failed while releasing them) are released again, so no number stays paid for at the provider.
 * Organizations being deleted are left to their teardown (their account isn't `active`).
 */
export async function retryUnfinishedSmsReleases(
  deps: SmsSenderDeps,
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select({ number: smsNumber })
    .from(smsNumber)
    .innerJoin(smsAccount, eq(smsAccount.organizationId, smsNumber.organizationId))
    .where(
      and(
        eq(smsNumber.status, "releasing"),
        lte(smsNumber.updatedAt, new Date(now.getTime() - RELEASE_RETRY_MS)),
        eq(smsAccount.status, "active"),
        or(eq(smsNumber.provider, deps.provider), eq(smsNumber.provider, "fake")),
        opts.scope ? inArray(smsNumber.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(smsNumber.updatedAt))
    .limit(opts.limit ?? 20);
  let released = 0;
  for (const { number } of due) {
    try {
      await finishRelease(number, deps);
      released++;
    } catch (error) {
      console.error(`[sms] number ${number.id} still not released:`, error);
    }
  }
  return released;
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
  if (
    account?.subaccountSid &&
    account.status !== "closed" &&
    account.provider !== deps.provider &&
    account.provider !== "fake"
  ) {
    // Deleting the rows would orphan a paid subaccount: the deletion waits for a deployment with
    // the account's provider.
    throw new Error(
      `SMS subaccount of ${organizationId} is at ${account.provider}, not ${deps.provider}: not closed.`,
    );
  }
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
