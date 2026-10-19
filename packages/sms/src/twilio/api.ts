/**
 * The Twilio calls coss.com makes, behind one interface (`createTwilioApi` over the REST client,
 * `FakeTwilioApi` for tests and local development). Messages and numbers go through the 2010 API
 * with the parent account's credentials on the subaccount's path; Trust Hub, brands, campaigns,
 * messaging services and toll-free verification act as the subaccount (its own credentials). The
 * flow follows Twilio's ISV guide for Standard and Low-Volume Standard brands: a secondary
 * customer profile in the subaccount, assigned to coss.com's primary customer profile, an A2P
 * trust product, the brand, then one messaging service and campaign per registration.
 */
import type { SmsBusinessProfile, SmsCampaignDetails } from "@coss/db/schema";
import {
  TWILIO_API,
  TWILIO_MESSAGING,
  TWILIO_TRUSTHUB,
  type TwilioClient,
  type TwilioCredentials,
} from "./client.ts";

/** Trust Hub policies (fixed by Twilio). */
export const SECONDARY_CUSTOMER_PROFILE_POLICY = "RNdfbf3fae0e1107f8aded0e7cead80bf5";
export const A2P_TRUST_PRODUCT_POLICY = "RNb0d4771c2c98518d916a3d4cd70a8f8b";

export type ReviewStatus = { status: "pending" | "approved" | "rejected"; reason: string | null };

export type AvailableNumber = {
  phoneNumber: string;
  locality: string | null;
  region: string | null;
};

export type SendMessageInput = {
  accountSid: string;
  to: string;
  from: string;
  body: string;
  messagingServiceSid: string | null;
  statusCallback: string | null;
};

export type TwilioMessage = { sid: string; status: string; errorCode: string | null };

export interface TwilioApi {
  sendMessage(input: SendMessageInput): Promise<TwilioMessage>;
  fetchMessage(accountSid: string, sid: string): Promise<TwilioMessage>;
  createSubaccount(friendlyName: string): Promise<TwilioCredentials>;
  closeSubaccount(accountSid: string): Promise<void>;
  searchNumbers(
    account: TwilioCredentials,
    input: { country: string; kind: "local" | "toll_free"; areaCode?: string; limit: number },
  ): Promise<AvailableNumber[]>;
  buyNumber(
    account: TwilioCredentials,
    input: { phoneNumber: string },
  ): Promise<{ sid: string; phoneNumber: string }>;
  releaseNumber(account: TwilioCredentials, sid: string): Promise<void>;
  createMessagingService(
    account: TwilioCredentials,
    input: { friendlyName: string; inboundRequestUrl: string; statusCallback: string },
  ): Promise<{ sid: string }>;
  addNumberToService(
    account: TwilioCredentials,
    serviceSid: string,
    numberSid: string,
  ): Promise<void>;
  deleteMessagingService(account: TwilioCredentials, serviceSid: string): Promise<void>;
  /** The secondary customer profile with its business, representative and address, submitted. */
  createCustomerProfile(
    account: TwilioCredentials,
    profile: SmsBusinessProfile,
  ): Promise<{ sid: string }>;
  customerProfileStatus(account: TwilioCredentials, sid: string): Promise<ReviewStatus>;
  createTrustProduct(
    account: TwilioCredentials,
    input: { customerProfileSid: string; profile: SmsBusinessProfile },
  ): Promise<{ sid: string }>;
  trustProductStatus(account: TwilioCredentials, sid: string): Promise<ReviewStatus>;
  createBrand(
    account: TwilioCredentials,
    input: { customerProfileSid: string; trustProductSid: string; lowVolume: boolean },
  ): Promise<{ sid: string }>;
  brandStatus(account: TwilioCredentials, sid: string): Promise<ReviewStatus>;
  createCampaign(
    account: TwilioCredentials,
    input: { serviceSid: string; brandSid: string; campaign: SmsCampaignDetails },
  ): Promise<{ sid: string }>;
  campaignStatus(
    account: TwilioCredentials,
    input: { serviceSid: string; campaignSid: string },
  ): Promise<ReviewStatus>;
  createTollFreeVerification(
    account: TwilioCredentials,
    input: { numberSid: string; profile: SmsBusinessProfile; campaign: SmsCampaignDetails },
  ): Promise<{ sid: string }>;
  tollFreeVerificationStatus(account: TwilioCredentials, sid: string): Promise<ReviewStatus>;
}

type TrustHubResource = { sid: string; status: string };

/** Trust Hub's statuses (`twilio-approved`, `twilio-rejected`, …) in three. */
function trustHubStatus(resource: {
  status: string;
  failure_reason?: string | null;
}): ReviewStatus {
  if (resource.status === "twilio-approved") return { status: "approved", reason: null };
  if (resource.status === "twilio-rejected") {
    return { status: "rejected", reason: resource.failure_reason ?? null };
  }
  return { status: "pending", reason: null };
}

function messageOf(raw: { sid: string; status: string; error_code?: number | string | null }) {
  return {
    sid: raw.sid,
    status: raw.status,
    errorCode:
      raw.error_code === null || raw.error_code === undefined ? null : String(raw.error_code),
  };
}

export function createTwilioApi(
  client: TwilioClient,
  opts: { primaryCustomerProfileSid: string | null },
): TwilioApi {
  const account = (sid: string) => `${TWILIO_API}/Accounts/${sid}`;

  async function trustHubEntity(
    as: TwilioCredentials,
    type: string,
    friendlyName: string,
    attributes: Record<string, unknown>,
  ): Promise<string> {
    const user = await client.request<{ sid: string }>("POST", `${TWILIO_TRUSTHUB}/EndUsers`, {
      as,
      form: { FriendlyName: friendlyName, Type: type, Attributes: JSON.stringify(attributes) },
    });
    return user.sid;
  }

  async function assign(as: TwilioCredentials, bundle: string, objectSid: string, kind: string) {
    await client.request("POST", `${TWILIO_TRUSTHUB}/${kind}/${bundle}/EntityAssignments`, {
      as,
      form: { ObjectSid: objectSid },
    });
  }

  async function evaluateAndSubmit(
    as: TwilioCredentials,
    kind: "CustomerProfiles" | "TrustProducts",
    sid: string,
    policySid: string,
  ) {
    await client.request("POST", `${TWILIO_TRUSTHUB}/${kind}/${sid}/Evaluations`, {
      as,
      form: { PolicySid: policySid },
    });
    await client.request("POST", `${TWILIO_TRUSTHUB}/${kind}/${sid}`, {
      as,
      form: { Status: "pending-review" },
    });
  }

  return {
    async sendMessage(input) {
      const raw = await client.request<{ sid: string; status: string; error_code: number | null }>(
        "POST",
        `${account(input.accountSid)}/Messages.json`,
        {
          form: {
            To: input.to,
            From: input.from,
            Body: input.body,
            MessagingServiceSid: input.messagingServiceSid ?? undefined,
            StatusCallback: input.statusCallback ?? undefined,
            // coss.com bills the segments it counts: Twilio must not re-encode the body.
            SmartEncoded: false,
          },
        },
      );
      return messageOf(raw);
    },

    async fetchMessage(accountSid, sid) {
      return messageOf(await client.request("GET", `${account(accountSid)}/Messages/${sid}.json`));
    },

    async createSubaccount(friendlyName) {
      const raw = await client.request<{ sid: string; auth_token: string }>(
        "POST",
        `${TWILIO_API}/Accounts.json`,
        { form: { FriendlyName: friendlyName } },
      );
      return { accountSid: raw.sid, authToken: raw.auth_token };
    },

    async closeSubaccount(accountSid) {
      await client.request("POST", `${account(accountSid)}.json`, { form: { Status: "closed" } });
    },

    async searchNumbers(as, input) {
      const type = input.kind === "toll_free" ? "TollFree" : "Local";
      const raw = await client.request<{
        available_phone_numbers: {
          phone_number: string;
          locality: string | null;
          region: string | null;
        }[];
      }>("GET", `${account(as.accountSid)}/AvailablePhoneNumbers/${input.country}/${type}.json`, {
        form: { SmsEnabled: true, AreaCode: input.areaCode, PageSize: input.limit },
      });
      return raw.available_phone_numbers.map((number) => ({
        phoneNumber: number.phone_number,
        locality: number.locality ?? null,
        region: number.region ?? null,
      }));
    },

    async buyNumber(as, input) {
      const raw = await client.request<{ sid: string; phone_number: string }>(
        "POST",
        `${account(as.accountSid)}/IncomingPhoneNumbers.json`,
        { form: { PhoneNumber: input.phoneNumber } },
      );
      return { sid: raw.sid, phoneNumber: raw.phone_number };
    },

    async releaseNumber(as, sid) {
      await client.request("DELETE", `${account(as.accountSid)}/IncomingPhoneNumbers/${sid}.json`);
    },

    async createMessagingService(as, input) {
      return client.request<{ sid: string }>("POST", `${TWILIO_MESSAGING}/Services`, {
        as,
        form: {
          FriendlyName: input.friendlyName,
          InboundRequestUrl: input.inboundRequestUrl,
          InboundMethod: "POST",
          StatusCallback: input.statusCallback,
          // Replies always go to the service's URL, whatever a number was configured with.
          UseInboundWebhookOnNumber: false,
        },
      });
    },

    async addNumberToService(as, serviceSid, numberSid) {
      await client.request("POST", `${TWILIO_MESSAGING}/Services/${serviceSid}/PhoneNumbers`, {
        as,
        form: { PhoneNumberSid: numberSid },
      });
    },

    async deleteMessagingService(as, serviceSid) {
      await client.request("DELETE", `${TWILIO_MESSAGING}/Services/${serviceSid}`, { as });
    },

    async createCustomerProfile(as, profile) {
      const bundle = await client.request<TrustHubResource>(
        "POST",
        `${TWILIO_TRUSTHUB}/CustomerProfiles`,
        {
          as,
          form: {
            FriendlyName: profile.legalName,
            Email: profile.contact.email,
            PolicySid: SECONDARY_CUSTOMER_PROFILE_POLICY,
          },
        },
      );
      const business = await trustHubEntity(
        as,
        "customer_profile_business_information",
        profile.legalName,
        {
          business_name: profile.legalName,
          business_identity: "direct_customer",
          business_type:
            profile.companyType === "NON_PROFIT" ? "Non-profit Corporation" : "Corporation",
          business_industry: profile.industry,
          business_registration_identifier: profile.taxIdType,
          business_registration_number: profile.taxId,
          business_regions_of_operation: "USA_AND_CANADA",
          website_url: profile.website,
          social_media_profile_urls: "",
        },
      );
      await assign(as, bundle.sid, business, "CustomerProfiles");
      const representative = await trustHubEntity(
        as,
        "authorized_representative_1",
        `${profile.contact.firstName} ${profile.contact.lastName}`,
        {
          first_name: profile.contact.firstName,
          last_name: profile.contact.lastName,
          email: profile.contact.email,
          phone_number: profile.contact.phone,
          business_title: profile.contact.title,
          job_position: profile.contact.jobPosition,
        },
      );
      await assign(as, bundle.sid, representative, "CustomerProfiles");
      const address = await client.request<{ sid: string }>(
        "POST",
        `${account(as.accountSid)}/Addresses.json`,
        {
          form: {
            CustomerName: profile.legalName,
            Street: profile.street,
            City: profile.city,
            Region: profile.region,
            PostalCode: profile.postalCode,
            IsoCountry: profile.country,
          },
        },
      );
      const document = await client.request<{ sid: string }>(
        "POST",
        `${TWILIO_TRUSTHUB}/SupportingDocuments`,
        {
          as,
          form: {
            FriendlyName: `${profile.legalName} address`,
            Type: "customer_profile_address",
            Attributes: JSON.stringify({ address_sids: address.sid }),
          },
        },
      );
      await assign(as, bundle.sid, document.sid, "CustomerProfiles");
      // Under coss.com's ISV profile: the secondary profile is assigned the primary one, by the
      // account the profile belongs to.
      if (opts.primaryCustomerProfileSid) {
        await assign(as, bundle.sid, opts.primaryCustomerProfileSid, "CustomerProfiles");
      }
      await evaluateAndSubmit(
        as,
        "CustomerProfiles",
        bundle.sid,
        SECONDARY_CUSTOMER_PROFILE_POLICY,
      );
      return { sid: bundle.sid };
    },

    async customerProfileStatus(as, sid) {
      return trustHubStatus(
        await client.request("GET", `${TWILIO_TRUSTHUB}/CustomerProfiles/${sid}`, { as }),
      );
    },

    async createTrustProduct(as, input) {
      const bundle = await client.request<TrustHubResource>(
        "POST",
        `${TWILIO_TRUSTHUB}/TrustProducts`,
        {
          as,
          form: {
            FriendlyName: `${input.profile.legalName} A2P`,
            Email: input.profile.contact.email,
            PolicySid: A2P_TRUST_PRODUCT_POLICY,
          },
        },
      );
      const messaging = await trustHubEntity(
        as,
        "us_a2p_messaging_profile_information",
        `${input.profile.legalName} messaging profile`,
        {
          company_type: input.profile.companyType === "PUBLIC_PROFIT" ? "public" : "private",
          ...(input.profile.stockExchange ? { stock_exchange: input.profile.stockExchange } : {}),
          ...(input.profile.stockTicker ? { stock_ticker: input.profile.stockTicker } : {}),
        },
      );
      await assign(as, bundle.sid, messaging, "TrustProducts");
      await assign(as, bundle.sid, input.customerProfileSid, "TrustProducts");
      await evaluateAndSubmit(as, "TrustProducts", bundle.sid, A2P_TRUST_PRODUCT_POLICY);
      return { sid: bundle.sid };
    },

    async trustProductStatus(as, sid) {
      return trustHubStatus(
        await client.request("GET", `${TWILIO_TRUSTHUB}/TrustProducts/${sid}`, { as }),
      );
    },

    async createBrand(as, input) {
      return client.request<{ sid: string }>("POST", `${TWILIO_MESSAGING}/a2p/BrandRegistrations`, {
        as,
        form: {
          CustomerProfileBundleSid: input.customerProfileSid,
          A2PProfileBundleSid: input.trustProductSid,
          // Low-volume standard brands skip secondary vetting (and its fee).
          SkipAutomaticSecVet: input.lowVolume,
        },
      });
    },

    async brandStatus(as, sid) {
      const raw = await client.request<{ status: string; failure_reason?: string | null }>(
        "GET",
        `${TWILIO_MESSAGING}/a2p/BrandRegistrations/${sid}`,
        { as },
      );
      if (raw.status === "APPROVED") return { status: "approved", reason: null };
      if (raw.status === "FAILED")
        return { status: "rejected", reason: raw.failure_reason ?? null };
      return { status: "pending", reason: null };
    },

    async createCampaign(as, input) {
      const { campaign } = input;
      return client.request<{ sid: string }>(
        "POST",
        `${TWILIO_MESSAGING}/Services/${input.serviceSid}/Compliance/Usa2p`,
        {
          as,
          form: {
            BrandRegistrationSid: input.brandSid,
            Description: campaign.description,
            MessageFlow: campaign.messageFlow,
            MessageSamples: campaign.samples,
            UsAppToPersonUsecase: campaign.useCase,
            HasEmbeddedLinks: campaign.hasEmbeddedLinks,
            HasEmbeddedPhone: campaign.hasEmbeddedPhone,
          },
        },
      );
    },

    async campaignStatus(as, input) {
      const raw = await client.request<{
        campaign_status: string;
        errors?: { description?: string }[];
      }>(
        "GET",
        `${TWILIO_MESSAGING}/Services/${input.serviceSid}/Compliance/Usa2p/${input.campaignSid}`,
        { as },
      );
      if (raw.campaign_status === "VERIFIED") return { status: "approved", reason: null };
      if (raw.campaign_status === "FAILED") {
        return {
          status: "rejected",
          reason:
            raw.errors
              ?.map((error) => error.description)
              .filter(Boolean)
              .join(" ") || null,
        };
      }
      return { status: "pending", reason: null };
    },

    async createTollFreeVerification(as, input) {
      const { profile, campaign } = input;
      return client.request<{ sid: string }>("POST", `${TWILIO_MESSAGING}/Tollfree/Verifications`, {
        as,
        form: {
          TollfreePhoneNumberSid: input.numberSid,
          BusinessName: profile.legalName,
          BusinessWebsite: profile.website,
          NotificationEmail: profile.contact.email,
          UseCaseCategories: [campaign.useCase],
          UseCaseSummary: campaign.description,
          ProductionMessageSample: campaign.samples[0] ?? "",
          OptInImageUrls: campaign.optInProofUrl ? [campaign.optInProofUrl] : [],
          OptInType: "WEB_FORM",
          MessageVolume: campaign.monthlyVolume ?? "1,000",
          AdditionalInformation: campaign.messageFlow,
          BusinessStreetAddress: profile.street,
          BusinessCity: profile.city,
          BusinessStateProvinceRegion: profile.region,
          BusinessPostalCode: profile.postalCode,
          BusinessCountry: profile.country,
          BusinessContactFirstName: profile.contact.firstName,
          BusinessContactLastName: profile.contact.lastName,
          BusinessContactEmail: profile.contact.email,
          BusinessContactPhone: profile.contact.phone,
        },
      });
    },

    async tollFreeVerificationStatus(as, sid) {
      const raw = await client.request<{ status: string; rejection_reason?: string | null }>(
        "GET",
        `${TWILIO_MESSAGING}/Tollfree/Verifications/${sid}`,
        { as },
      );
      if (raw.status === "TWILIO_APPROVED") return { status: "approved", reason: null };
      if (raw.status === "TWILIO_REJECTED") {
        return { status: "rejected", reason: raw.rejection_reason ?? null };
      }
      return { status: "pending", reason: null };
    },
  };
}
