/**
 * A stand-in for Twilio (`SMS_PROVIDER=fake`, tests). Stateless where it matters: the dashboard and
 * the worker each have their own instance, so what one creates the other must be able to look up.
 * Every review passes, except a business whose legal name contains `[reject]` (its resources' ids
 * say so); tests can hold reviews pending with `hold` and decide them with `decide`.
 */
import { randomBytes } from "node:crypto";
import type { SmsBusinessProfile } from "@coss/db/schema";
import type { AvailableNumber, ReviewStatus, TwilioApi, TwilioMessage } from "./api.ts";
import type { TwilioCredentials } from "./client.ts";

const REJECTED = "rejected";

function sid(prefix: string, rejected = false): string {
  return `${prefix}fake${rejected ? REJECTED : ""}${randomBytes(12).toString("hex")}`;
}

function rejects(profile: SmsBusinessProfile): boolean {
  return profile.legalName.includes("[reject]");
}

export class FakeTwilioApi implements TwilioApi {
  /** Every call, in order (method name and arguments), for tests. */
  readonly calls: { method: string; args: unknown[] }[] = [];
  readonly #held = new Map<string, ReviewStatus>();
  #holdNext = false;

  /** Reviews created from now on stay pending until `decide`d. */
  hold(): void {
    this.#holdNext = true;
  }

  decide(resourceSid: string, status: ReviewStatus): void {
    this.#held.set(resourceSid, status);
  }

  #record(method: string, args: unknown[]): void {
    this.calls.push({ method, args });
  }

  #created(prefix: string, rejected: boolean): { sid: string } {
    const created = sid(prefix, rejected);
    if (this.#holdNext) this.#held.set(created, { status: "pending", reason: null });
    return { sid: created };
  }

  #status(resourceSid: string): ReviewStatus {
    const held = this.#held.get(resourceSid);
    if (held) return held;
    return resourceSid.includes(REJECTED)
      ? { status: "rejected", reason: "Simulated rejection: the business details didn't match." }
      : { status: "approved", reason: null };
  }

  async sendMessage(input: Parameters<TwilioApi["sendMessage"]>[0]): Promise<TwilioMessage> {
    this.#record("sendMessage", [input]);
    return { sid: sid("SM"), status: "queued", errorCode: null };
  }

  async fetchMessage(accountSid: string, messageSid: string): Promise<TwilioMessage> {
    this.#record("fetchMessage", [accountSid, messageSid]);
    return { sid: messageSid, status: "delivered", errorCode: null };
  }

  async createSubaccount(friendlyName: string): Promise<TwilioCredentials> {
    this.#record("createSubaccount", [friendlyName]);
    return { accountSid: sid("AC"), authToken: randomBytes(16).toString("hex") };
  }

  async closeSubaccount(accountSid: string): Promise<void> {
    this.#record("closeSubaccount", [accountSid]);
  }

  async searchNumbers(
    account: TwilioCredentials,
    input: Parameters<TwilioApi["searchNumbers"]>[1],
  ): Promise<AvailableNumber[]> {
    this.#record("searchNumbers", [account.accountSid, input]);
    const area = input.kind === "toll_free" ? "833" : (input.areaCode ?? "415");
    return Array.from({ length: input.limit }, () => {
      const exchange = 200 + Math.floor(Math.random() * 800);
      const line = String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
      return {
        phoneNumber: `+1${area}${exchange}${line}`,
        locality: input.kind === "toll_free" ? null : "San Francisco",
        region: input.kind === "toll_free" ? null : "CA",
      };
    });
  }

  async buyNumber(account: TwilioCredentials, input: { phoneNumber: string }) {
    this.#record("buyNumber", [account.accountSid, input]);
    return { sid: sid("PN"), phoneNumber: input.phoneNumber };
  }

  async releaseNumber(account: TwilioCredentials, numberSid: string): Promise<void> {
    this.#record("releaseNumber", [account.accountSid, numberSid]);
  }

  async createMessagingService(
    account: TwilioCredentials,
    input: Parameters<TwilioApi["createMessagingService"]>[1],
  ) {
    this.#record("createMessagingService", [account.accountSid, input]);
    return { sid: sid("MG") };
  }

  async addNumberToService(account: TwilioCredentials, serviceSid: string, numberSid: string) {
    this.#record("addNumberToService", [account.accountSid, serviceSid, numberSid]);
  }

  async deleteMessagingService(account: TwilioCredentials, serviceSid: string) {
    this.#record("deleteMessagingService", [account.accountSid, serviceSid]);
  }

  async createCustomerProfile(account: TwilioCredentials, profile: SmsBusinessProfile) {
    this.#record("createCustomerProfile", [account.accountSid, profile]);
    return this.#created("BU", rejects(profile));
  }

  async customerProfileStatus(_account: TwilioCredentials, resourceSid: string) {
    return this.#status(resourceSid);
  }

  async createTrustProduct(
    account: TwilioCredentials,
    input: Parameters<TwilioApi["createTrustProduct"]>[1],
  ) {
    this.#record("createTrustProduct", [account.accountSid, input]);
    return this.#created("BU", rejects(input.profile));
  }

  async trustProductStatus(_account: TwilioCredentials, resourceSid: string) {
    return this.#status(resourceSid);
  }

  async createBrand(account: TwilioCredentials, input: Parameters<TwilioApi["createBrand"]>[1]) {
    this.#record("createBrand", [account.accountSid, input]);
    return this.#created("BN", input.trustProductSid.includes(REJECTED));
  }

  async brandStatus(_account: TwilioCredentials, resourceSid: string) {
    return this.#status(resourceSid);
  }

  async createCampaign(
    account: TwilioCredentials,
    input: Parameters<TwilioApi["createCampaign"]>[1],
  ) {
    this.#record("createCampaign", [account.accountSid, input]);
    return this.#created("QE", input.brandSid.includes(REJECTED));
  }

  async campaignStatus(
    _account: TwilioCredentials,
    input: { serviceSid: string; campaignSid: string },
  ) {
    return this.#status(input.campaignSid);
  }

  async createTollFreeVerification(
    account: TwilioCredentials,
    input: Parameters<TwilioApi["createTollFreeVerification"]>[1],
  ) {
    this.#record("createTollFreeVerification", [account.accountSid, input]);
    return this.#created("HH", rejects(input.profile));
  }

  async tollFreeVerificationStatus(_account: TwilioCredentials, resourceSid: string) {
    return this.#status(resourceSid);
  }
}
