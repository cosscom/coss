import { randomBytes } from "node:crypto";
import type {
  DomainIdentity,
  DomainIdentityState,
  EmailStream,
  IdentityProvider,
  ProviderTenant,
} from "../provider.ts";

/**
 * In-memory identities that verify immediately, for local development and tests. DNS is never
 * consulted, so any domain (e.g. `acme.test`) can be used.
 */
export class FakeIdentityProvider implements IdentityProvider {
  readonly name = "fake";
  readonly #identities = new Map<string, DomainIdentity>();
  readonly #verify: (domain: string) => boolean;

  /** `verify` decides whether a domain verifies (default: always). */
  constructor(opts: { verify?: (domain: string) => boolean } = {}) {
    this.#verify = opts.verify ?? (() => true);
  }

  async ensureTenant(input: {
    organizationId: string;
    stream: EmailStream;
    subaccountId?: string | null;
  }): Promise<ProviderTenant> {
    const suffix = input.stream === "transactional" ? "" : `-${input.stream}`;
    const owner = input.subaccountId ?? input.organizationId;
    return { tenantName: `fake-${owner}${suffix}`, tenantArn: null };
  }

  async createDomainIdentity(input: { domain: string }): Promise<DomainIdentity> {
    const identity: DomainIdentity = {
      dkimTokens: [1, 2, 3].map(() => randomBytes(16).toString("hex")),
      dkimHostedZone: "dkim.amazonses.com",
      region: "us-east-1",
    };
    this.#identities.set(input.domain, identity);
    return identity;
  }

  async associateDomainIdentity(): Promise<void> {}

  async getDomainIdentity(domain: string): Promise<DomainIdentityState | null> {
    // Identities created by another process (e.g. the dashboard) are unknown here: treat them as
    // existing, since a fake identity has nothing to lose.
    const identity = this.#identities.get(domain) ?? {
      dkimTokens: [],
      dkimHostedZone: "dkim.amazonses.com",
      region: "us-east-1",
    };
    const verified = this.#verify(domain);
    return {
      ...identity,
      status: verified ? "verified" : "pending",
      canSend: verified,
      mailFromStatus: verified ? "success" : "pending",
    };
  }

  async deleteDomainIdentity(input: { domain: string }): Promise<void> {
    this.#identities.delete(input.domain);
  }

  async deleteTenant(): Promise<void> {}
}
