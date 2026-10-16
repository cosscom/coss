import {
  type DedicatedIpProvider,
  DedicatedIpTakenError,
  type ProviderTenant,
} from "../provider.ts";
import { accountOf, isSesError, type SesApi, type SesConfig, tenantNameFor } from "./api.ts";
import { MANAGED_TAG } from "./identity.ts";

/**
 * SES managed dedicated IPs: one managed pool per organization (SES leases, scales and warms up
 * its IPs, spilling to the shared pool while it does) and a configuration set of the same name
 * that sends through it. The set copies the shared set's event destinations (so its events reach
 * the worker like every other) and is associated with the organization's tenant, which may only
 * send with sets associated with it. Both carry `coss_managed=<prefix>`: COSS never adopts or
 * deletes a pool or set it didn't create.
 */
export class SesDedicatedIpProvider implements DedicatedIpProvider {
  readonly name = "ses";
  readonly #api: SesApi;
  readonly #config: SesConfig;

  constructor(api: SesApi, config: SesConfig) {
    this.#api = api;
    this.#config = config;
  }

  #name(organizationId: string): string {
    return tenantNameFor(this.#config.tenantPrefix, organizationId);
  }

  #arn(account: string, resource: "dedicated-ip-pool" | "configuration-set", name: string) {
    return `arn:aws:ses:${this.#config.region}:${account}:${resource}/${name}`;
  }

  #tags(organizationId: string) {
    return [
      { Key: MANAGED_TAG, Value: this.#config.tenantPrefix },
      { Key: "coss_organization_id", Value: organizationId },
    ];
  }

  /** Whether this deployment created the resource (`null`: it doesn't exist). */
  async #managedByUs(arn: string): Promise<boolean | null> {
    try {
      const { Tags = [] } = await this.#api.listTagsForResource({ ResourceArn: arn });
      return Tags.some((tag) => tag.Key === MANAGED_TAG && tag.Value === this.#config.tenantPrefix);
    } catch (error) {
      if (isSesError(error, "NotFoundException")) return null;
      throw error;
    }
  }

  /** Runs `create`; an existing resource is fine only if this deployment created it. */
  async #create(arn: string, label: string, create: () => Promise<unknown>): Promise<void> {
    try {
      await create();
    } catch (error) {
      if (!isSesError(error, "AlreadyExistsException")) throw error;
      if (!(await this.#managedByUs(arn))) throw new DedicatedIpTakenError(label);
    }
  }

  async ensurePool(input: { organizationId: string; tenant: ProviderTenant }): Promise<void> {
    const tenantArn = await this.#tenantArn(input.tenant);
    if (!tenantArn) throw new Error(`SES tenant ${input.tenant.tenantName} doesn't exist.`);
    const account = accountOf(tenantArn);
    const name = this.#name(input.organizationId);
    const tags = this.#tags(input.organizationId);

    await this.#create(
      this.#arn(account, "dedicated-ip-pool", name),
      `Dedicated IP pool ${name}`,
      () => this.#api.createDedicatedIpPool({ PoolName: name, ScalingMode: "MANAGED", Tags: tags }),
    );
    const configurationSetArn = this.#arn(account, "configuration-set", name);
    await this.#create(configurationSetArn, `Configuration set ${name}`, () =>
      this.#api.createConfigurationSet({
        ConfigurationSetName: name,
        DeliveryOptions: { SendingPoolName: name },
        ReputationOptions: { ReputationMetricsEnabled: true },
        SendingOptions: { SendingEnabled: true },
        // COSS keeps the only suppression list (see `TENANT_SUPPRESSION`).
        SuppressionOptions: { SuppressedReasons: [] },
        Tags: tags,
      }),
    );
    const { EventDestinations = [] } = await this.#api.getConfigurationSetEventDestinations({
      ConfigurationSetName: this.#config.configurationSet,
    });
    for (const destination of EventDestinations) {
      if (!destination.Name) continue;
      try {
        await this.#api.createConfigurationSetEventDestination({
          ConfigurationSetName: name,
          EventDestinationName: destination.Name,
          EventDestination: {
            Enabled: destination.Enabled,
            MatchingEventTypes: destination.MatchingEventTypes,
            SnsDestination: destination.SnsDestination,
            EventBridgeDestination: destination.EventBridgeDestination,
            CloudWatchDestination: destination.CloudWatchDestination,
            KinesisFirehoseDestination: destination.KinesisFirehoseDestination,
          },
        });
      } catch (error) {
        if (!isSesError(error, "AlreadyExistsException")) throw error;
      }
    }
    try {
      await this.#api.createTenantResourceAssociation({
        TenantName: input.tenant.tenantName,
        ResourceArn: configurationSetArn,
      });
    } catch (error) {
      if (!isSesError(error, "AlreadyExistsException")) throw error;
    }
  }

  async poolIps(organizationId: string): Promise<string[]> {
    const ips: string[] = [];
    let NextToken: string | undefined;
    do {
      let page: Awaited<ReturnType<SesApi["getDedicatedIps"]>>;
      try {
        page = await this.#api.getDedicatedIps({
          PoolName: this.#name(organizationId),
          PageSize: 100,
          ...(NextToken ? { NextToken } : {}),
        });
      } catch (error) {
        if (isSesError(error, "NotFoundException")) return [];
        throw error;
      }
      for (const ip of page.DedicatedIps ?? []) if (ip.Ip) ips.push(ip.Ip);
      NextToken = page.NextToken;
    } while (NextToken);
    return ips.sort();
  }

  async releasePool(input: {
    organizationId: string;
    tenant: ProviderTenant | null;
  }): Promise<void> {
    const name = this.#name(input.organizationId);
    // Resources are named by the tenant's account; without a tenant nothing was ever created.
    const tenant = input.tenant;
    const tenantArn = tenant && (await this.#tenantArn(tenant));
    if (!tenant || !tenantArn) return;
    const account = accountOf(tenantArn);
    const configurationSetArn = this.#arn(account, "configuration-set", name);
    // SES refuses to delete a configuration set that is still associated with a tenant.
    try {
      await this.#api.deleteTenantResourceAssociation({
        TenantName: tenant.tenantName,
        ResourceArn: configurationSetArn,
      });
    } catch (error) {
      if (!isSesError(error, "NotFoundException")) throw error;
    }
    if (await this.#managedByUs(configurationSetArn)) {
      try {
        await this.#api.deleteConfigurationSet({ ConfigurationSetName: name });
      } catch (error) {
        if (!isSesError(error, "NotFoundException")) throw error;
      }
    }
    if (await this.#managedByUs(this.#arn(account, "dedicated-ip-pool", name))) {
      try {
        await this.#api.deleteDedicatedIpPool({ PoolName: name });
      } catch (error) {
        if (!isSesError(error, "NotFoundException")) throw error;
      }
    }
  }

  /** The tenant's ARN (`null`: the tenant doesn't exist). */
  async #tenantArn(tenant: ProviderTenant): Promise<string | null> {
    if (tenant.tenantArn) return tenant.tenantArn;
    try {
      const { Tenant } = await this.#api.getTenant({ TenantName: tenant.tenantName });
      return Tenant?.TenantArn ?? null;
    } catch (error) {
      if (isSesError(error, "NotFoundException")) return null;
      throw error;
    }
  }
}
