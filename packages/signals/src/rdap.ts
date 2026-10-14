/**
 * When a domain was registered, from its registry's RDAP service (RFC 9083), found through IANA's
 * bootstrap file (RFC 9224). Only the domain name leaves the server. Throws on network errors and
 * timeouts; a registry without the domain is `not_found`.
 */
import { domainAndParents } from "./email.ts";

export const RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 24 * 60 * 60_000;
/** Labels to drop from the left at most (`mail.acme.co.uk` → `acme.co.uk` → `co.uk`). */
const MAX_CANDIDATES = 3;

export type DomainRegistration =
  | { status: "found"; registeredAt: Date | null }
  | { status: "not_found" | "unavailable"; registeredAt: null };

type Bootstrap = { services: [string[], string[]][] };

export type RdapClient = {
  /** The registration of `domain`, or of its nearest registered parent. */
  registration(domain: string, signal?: AbortSignal): Promise<DomainRegistration>;
};

export function rdapClient(opts: { fetch?: typeof fetch; now?: () => number } = {}): RdapClient {
  const fetcher = opts.fetch ?? fetch;
  const now = opts.now ?? Date.now;
  let bootstrap: { services: Map<string, string>; loadedAt: number } | null = null;
  let loading: Promise<Map<string, string>> | null = null;

  async function servicesFor(signal?: AbortSignal): Promise<Map<string, string>> {
    if (bootstrap && now() - bootstrap.loadedAt < BOOTSTRAP_TTL_MS) return bootstrap.services;
    loading ??= (async () => {
      try {
        const response = await fetcher(RDAP_BOOTSTRAP_URL, { signal });
        if (!response.ok) throw new Error(`RDAP bootstrap answered ${response.status}`);
        const data = (await response.json()) as Bootstrap;
        const services = new Map<string, string>();
        for (const [tlds, urls] of data.services ?? []) {
          const url = urls.find((candidate) => candidate.startsWith("https://")) ?? urls[0];
          if (!url) continue;
          for (const tld of tlds)
            services.set(tld.toLowerCase(), url.endsWith("/") ? url : `${url}/`);
        }
        bootstrap = { services, loadedAt: now() };
        return services;
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  return {
    async registration(domain, signal) {
      const name = domain.toLowerCase().replace(/\.$/, "");
      const tld = name.slice(name.lastIndexOf(".") + 1);
      const base = (await servicesFor(signal)).get(tld);
      if (!base) return { status: "unavailable", registeredAt: null };
      for (const candidate of domainAndParents(name).slice(0, MAX_CANDIDATES)) {
        const response = await fetcher(`${base}domain/${encodeURIComponent(candidate)}`, {
          headers: { Accept: "application/rdap+json" },
          signal,
        });
        if (response.status === 404) continue;
        if (!response.ok) throw new Error(`RDAP for .${tld} answered ${response.status}`);
        const data = (await response.json()) as {
          events?: { eventAction?: string; eventDate?: string }[];
        };
        const event = data.events?.find((item) => item.eventAction === "registration");
        const date = event?.eventDate ? new Date(event.eventDate) : null;
        return {
          status: "found",
          registeredAt: date && !Number.isNaN(date.getTime()) ? date : null,
        };
      }
      return { status: "not_found", registeredAt: null };
    },
  };
}
