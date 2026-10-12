/**
 * Builds the email product's providers from configuration. Apps validate their environment and
 * pass it here, so the API, dashboard and worker all wire providers the same way.
 */
import type { PlanGate } from "@coss/billing/gate";
import {
  type CloudflareConfig,
  CloudflareTrackingHostnameProvider,
} from "./cloudflare/custom-hostnames.ts";
import type { DnsResolver } from "./dns.ts";
import { publicDnsResolver } from "./dns.ts";
import type { DomainDeps } from "./domains.ts";
import { DEFAULT_TRACKING_CNAME_TARGET, type EmailEnv, type EmailProviderName } from "./env.ts";
import type { EmailProvider, IdentityProvider } from "./provider.ts";
import { FakeEmailProvider } from "./providers/fake.ts";
import { FakeIdentityProvider } from "./providers/fake-identity.ts";
import { FakeTrackingHostnameProvider } from "./providers/fake-tracking-hostnames.ts";
import { createSesApi, type SesApi, type SesConfig } from "./ses/api.ts";
import { SesIdentityProvider } from "./ses/identity.ts";
import { SesEmailProvider } from "./ses/provider.ts";
import type { TrackingHostnameProvider } from "./tracking-hostnames.ts";

export {
  EMAIL_PROVIDERS,
  type EmailEnv,
  type EmailProviderName,
  emailEnvShape,
  emailWorkerEnvShape,
  TRACKING_DOMAIN_PROVIDERS,
  type TrackingDomainProviderName,
} from "./env.ts";

/** What serves custom tracking hostnames (default: the fake). */
export type TrackingRuntimeConfig =
  | { provider: "fake"; cnameTarget?: string }
  | ({ provider: "cloudflare" } & CloudflareConfig);

export type EmailRuntimeConfig = (
  | { provider: "fake"; log?: boolean }
  | { provider: "ses"; ses: SesConfig; log?: boolean; sesApi?: SesApi; dns?: DnsResolver | null }
) & { tracking?: TrackingRuntimeConfig };

/** The tracking hostname config for validated app env; `cloudflare` requires its variables. */
function trackingRuntimeConfig(env: EmailEnv): TrackingRuntimeConfig {
  const cnameTarget = env.TRACKING_CNAME_TARGET || DEFAULT_TRACKING_CNAME_TARGET;
  if (env.TRACKING_DOMAIN_PROVIDER !== "cloudflare") return { provider: "fake", cnameTarget };
  const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID } = env;
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    throw new Error(
      "TRACKING_DOMAIN_PROVIDER=cloudflare requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.",
    );
  }
  return {
    provider: "cloudflare",
    apiToken: CLOUDFLARE_API_TOKEN,
    zoneId: CLOUDFLARE_ZONE_ID,
    cnameTarget,
  };
}

/** The runtime config for validated app env; `EMAIL_PROVIDER=ses` requires the SES variables. */
export function emailRuntimeConfig(env: EmailEnv): EmailRuntimeConfig {
  const tracking = trackingRuntimeConfig(env);
  if (env.EMAIL_PROVIDER === "fake") return { provider: "fake", tracking };
  const { AWS_REGION, SES_CONFIGURATION_SET, SES_TENANT_PREFIX } = env;
  if (!AWS_REGION || !SES_CONFIGURATION_SET || !SES_TENANT_PREFIX) {
    throw new Error(
      "EMAIL_PROVIDER=ses requires AWS_REGION, SES_CONFIGURATION_SET and SES_TENANT_PREFIX " +
        "(see `bun run ses:bootstrap`).",
    );
  }
  return {
    provider: "ses",
    ses: {
      region: AWS_REGION,
      configurationSet: SES_CONFIGURATION_SET,
      tenantPrefix: SES_TENANT_PREFIX,
    },
    tracking,
  };
}

export type EmailRuntime = {
  provider: EmailProviderName;
  liveProvider: EmailProvider;
  /** Sandbox environments always use the fake provider, whatever live environments use. */
  sandboxProvider: EmailProvider;
  identity: IdentityProvider;
  /** `null` with the fake provider: its domains verify without DNS. */
  dns: DnsResolver | null;
  trackingHostnames: TrackingHostnameProvider;
  domainDeps: DomainDeps;
};

function createTrackingHostnameProvider(
  config: TrackingRuntimeConfig | undefined,
): TrackingHostnameProvider {
  if (config?.provider === "cloudflare") return new CloudflareTrackingHostnameProvider(config);
  return new FakeTrackingHostnameProvider({
    cnameTarget: config?.cnameTarget ?? DEFAULT_TRACKING_CNAME_TARGET,
  });
}

/** `plans`: the organization's plan limits on domains (the apps pass `createPlanGate()`). */
export function createEmailRuntime(
  config: EmailRuntimeConfig,
  extras: { plans?: PlanGate } = {},
): EmailRuntime {
  const sandboxProvider = new FakeEmailProvider({ log: config.log });
  let liveProvider: EmailProvider;
  let identity: IdentityProvider;
  let dns: DnsResolver | null;
  switch (config.provider) {
    case "fake":
      liveProvider = new FakeEmailProvider({ log: config.log });
      identity = new FakeIdentityProvider();
      dns = null;
      break;
    case "ses": {
      const api = config.sesApi ?? createSesApi(config.ses.region);
      liveProvider = new SesEmailProvider(api, config.ses);
      identity = new SesIdentityProvider(api, config.ses);
      dns = config.dns === undefined ? publicDnsResolver() : config.dns;
      break;
    }
  }
  const trackingHostnames = createTrackingHostnameProvider(config.tracking);
  return {
    provider: config.provider,
    liveProvider,
    sandboxProvider,
    identity,
    dns,
    trackingHostnames,
    domainDeps: { identity, dns, tracking: trackingHostnames, plans: extras.plans },
  };
}
