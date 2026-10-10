/**
 * Builds the email product's providers from configuration. Apps validate their environment and
 * pass it here, so the API, dashboard and worker all wire providers the same way.
 */
import type { DnsResolver } from "./dns.ts";
import { publicDnsResolver } from "./dns.ts";
import type { DomainDeps } from "./domains.ts";
import type { EmailEnv, EmailProviderName } from "./env.ts";
import type { EmailProvider, IdentityProvider } from "./provider.ts";
import { FakeEmailProvider } from "./providers/fake.ts";
import { FakeIdentityProvider } from "./providers/fake-identity.ts";
import { createEmailService, type EmailService } from "./service.ts";
import { createSesApi, type SesApi, type SesConfig } from "./ses/api.ts";
import { SesIdentityProvider } from "./ses/identity.ts";
import { SesEmailProvider } from "./ses/provider.ts";

export {
  EMAIL_PROVIDERS,
  type EmailEnv,
  type EmailProviderName,
  emailEnvShape,
  emailWorkerEnvShape,
} from "./env.ts";

export type EmailRuntimeConfig =
  | { provider: "fake"; log?: boolean }
  | { provider: "ses"; ses: SesConfig; log?: boolean; sesApi?: SesApi; dns?: DnsResolver | null };

/** The runtime config for validated app env; `EMAIL_PROVIDER=ses` requires the SES variables. */
export function emailRuntimeConfig(env: EmailEnv): EmailRuntimeConfig {
  if (env.EMAIL_PROVIDER === "fake") return { provider: "fake" };
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
  domainDeps: DomainDeps;
  emailService: EmailService;
};

export function createEmailRuntime(config: EmailRuntimeConfig): EmailRuntime {
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
  return {
    provider: config.provider,
    liveProvider,
    sandboxProvider,
    identity,
    dns,
    domainDeps: { identity, dns },
    emailService: createEmailService({ liveProvider, sandboxProvider }),
  };
}
