import type { GetEmailIdentityCommandOutput } from "@aws-sdk/client-sesv2";
import {
  type DomainIdentity,
  type DomainIdentityState,
  type DomainVerificationStatus,
  type IdentityProvider,
  IdentityTakenError,
  type MailFromStatus,
  type ProviderTenant,
} from "../provider.ts";
import {
  accountOf,
  isSesError,
  type SesApi,
  type SesConfig,
  TENANT_SUPPRESSION,
  tenantNameFor,
} from "./api.ts";

const DKIM_STATUS: Record<string, DomainVerificationStatus> = {
  SUCCESS: "verified",
  PENDING: "pending",
  NOT_STARTED: "pending",
  TEMPORARY_FAILURE: "temporary_failure",
  FAILED: "failed",
};

const MAIL_FROM_STATUS: Record<string, MailFromStatus> = {
  SUCCESS: "success",
  PENDING: "pending",
  TEMPORARY_FAILURE: "temporary_failure",
  FAILED: "failed",
};

/** SES tenants (one per organization) and domain identities with Easy DKIM + MAIL FROM. */
export class SesIdentityProvider implements IdentityProvider {
  readonly name = "ses";
  readonly #api: SesApi;
  readonly #config: SesConfig;

  constructor(api: SesApi, config: SesConfig) {
    this.#api = api;
    this.#config = config;
  }

  #configurationSetArn(account: string): string {
    return `arn:aws:ses:${this.#config.region}:${account}:configuration-set/${this.#config.configurationSet}`;
  }

  #identityArn(account: string, domain: string): string {
    return `arn:aws:ses:${this.#config.region}:${account}:identity/${domain}`;
  }

  async #tenantArn(tenant: ProviderTenant): Promise<string> {
    if (tenant.tenantArn) return tenant.tenantArn;
    const { Tenant } = await this.#api.getTenant({ TenantName: tenant.tenantName });
    if (!Tenant?.TenantArn) throw new Error(`SES tenant ${tenant.tenantName} has no ARN.`);
    return Tenant.TenantArn;
  }

  async #associate(tenantName: string, resourceArn: string): Promise<void> {
    try {
      await this.#api.createTenantResourceAssociation({
        TenantName: tenantName,
        ResourceArn: resourceArn,
      });
    } catch (error) {
      if (!isSesError(error, "AlreadyExistsException")) throw error;
    }
  }

  async ensureTenant(input: { organizationId: string }): Promise<ProviderTenant> {
    const tenantName = tenantNameFor(this.#config.tenantPrefix, input.organizationId);
    let tenantArn: string | undefined;
    try {
      const created = await this.#api.createTenant({
        TenantName: tenantName,
        SuppressionAttributes: TENANT_SUPPRESSION,
        Tags: [{ Key: "coss_organization_id", Value: input.organizationId }],
      });
      tenantArn = created.TenantArn;
    } catch (error) {
      if (!isSesError(error, "AlreadyExistsException")) throw error;
      // Existing tenants are migrated by ses:bootstrap before their protection is disabled.
    }
    tenantArn ??= await this.#tenantArn({ tenantName, tenantArn: null });
    // A tenant can only send with configuration sets associated with it.
    await this.#associate(tenantName, this.#configurationSetArn(accountOf(tenantArn)));
    return { tenantName, tenantArn };
  }

  async #create(domain: string): Promise<GetEmailIdentityCommandOutput["DkimAttributes"]> {
    const created = await this.#api.createEmailIdentity({
      EmailIdentity: domain,
      ConfigurationSetName: this.#config.configurationSet,
      DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" },
    });
    return created.DkimAttributes;
  }

  async createDomainIdentity(input: {
    tenant: ProviderTenant;
    domain: string;
    mailFromDomain: string;
  }): Promise<DomainIdentity> {
    const account = accountOf(await this.#tenantArn(input.tenant));
    const identityArn = this.#identityArn(account, input.domain);
    let dkim: GetEmailIdentityCommandOutput["DkimAttributes"];
    try {
      dkim = await this.#create(input.domain);
    } catch (error) {
      if (!isSesError(error, "AlreadyExistsException")) throw error;
      // Never adopt an identity another tenant holds; an orphan is recreated so its DKIM keys
      // (and so its DNS records) are new and can only be published by whoever controls DNS now.
      const { ResourceTenants = [] } = await this.#api.listResourceTenants({
        ResourceArn: identityArn,
      });
      if (ResourceTenants.some((t) => t.TenantName !== input.tenant.tenantName)) {
        throw new IdentityTakenError(input.domain);
      }
      if (ResourceTenants.length > 0) {
        dkim = (await this.#api.getEmailIdentity({ EmailIdentity: input.domain })).DkimAttributes;
      } else {
        await this.#api.deleteEmailIdentity({ EmailIdentity: input.domain });
        dkim = await this.#create(input.domain);
      }
    }
    await this.#api.putEmailIdentityMailFromAttributes({
      EmailIdentity: input.domain,
      MailFromDomain: input.mailFromDomain,
      // Without the MX record, mail still goes out with SES's own MAIL FROM (DKIM keeps DMARC).
      BehaviorOnMxFailure: "USE_DEFAULT_VALUE",
    });
    await this.#associate(input.tenant.tenantName, identityArn);
    return {
      dkimTokens: dkim?.Tokens ?? [],
      dkimHostedZone: dkim?.SigningHostedZone ?? "dkim.amazonses.com",
      region: this.#config.region,
    };
  }

  async getDomainIdentity(domain: string): Promise<DomainIdentityState | null> {
    let identity: GetEmailIdentityCommandOutput;
    try {
      identity = await this.#api.getEmailIdentity({ EmailIdentity: domain });
    } catch (error) {
      if (isSesError(error, "NotFoundException")) return null;
      throw error;
    }
    const dkim = identity.DkimAttributes;
    return {
      dkimTokens: dkim?.Tokens ?? [],
      dkimHostedZone: dkim?.SigningHostedZone ?? "dkim.amazonses.com",
      region: this.#config.region,
      status: DKIM_STATUS[dkim?.Status ?? "PENDING"] ?? "pending",
      canSend: identity.VerifiedForSendingStatus ?? false,
      mailFromStatus:
        MAIL_FROM_STATUS[identity.MailFromAttributes?.MailFromDomainStatus ?? "PENDING"] ??
        "pending",
    };
  }

  async deleteDomainIdentity(input: { tenant: ProviderTenant; domain: string }): Promise<void> {
    if (input.tenant.tenantName) {
      try {
        const account = accountOf(await this.#tenantArn(input.tenant));
        await this.#api.deleteTenantResourceAssociation({
          TenantName: input.tenant.tenantName,
          ResourceArn: this.#identityArn(account, input.domain),
        });
      } catch (error) {
        if (!isSesError(error, "NotFoundException")) throw error;
      }
    }
    try {
      await this.#api.deleteEmailIdentity({ EmailIdentity: input.domain });
    } catch (error) {
      if (!isSesError(error, "NotFoundException")) throw error;
    }
  }
}
