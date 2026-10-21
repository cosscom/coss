import { describe, expect, test } from "bun:test";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import type { DomainRecord } from "@coss/db/schema";
import { expectedRecords } from "../src/dns.ts";
import {
  DOMAIN_CONNECT_TEMPLATE,
  type DomainConnectDomain,
  type DomainConnectGroup,
  type DomainConnectHttp,
  type DomainConnectProvider,
  type DomainConnectTracking,
  discoverDomainConnect,
  domainConnectApplyUrl,
  domainConnectGroups,
  domainConnectPublicKeyRecords,
  domainConnectVariables,
  parseDomainConnectKey,
  publicHttpGetter,
  zoneCandidates,
} from "../src/domain-connect.ts";
import { fakeDnsResolver } from "../src/testing.ts";

const TOKENS = ["aaaa1111", "bbbb2222", "cccc3333"];
const SETTINGS = {
  providerId: "cloudflare.com",
  providerName: "Cloudflare",
  providerDisplayName: "Cloudflare",
  urlSyncUX: "https://dash.cloudflare.com/domainconnect",
  urlAPI: "https://api.cloudflare.com/client/v4/dns/domainconnect",
};
const TEMPLATE_PATH = "/v2/domainTemplates/providers/coss.com/services/email";

function domainOf(name: string, overrides: Partial<DomainConnectDomain> = {}): DomainConnectDomain {
  return {
    name,
    dkimTokens: TOKENS,
    dkimHostedZone: "dkim.amazonses.com",
    region: "eu-west-1",
    dmarcInheritedRecord: null,
    ...overrides,
  };
}

function recordsOf(domain: DomainConnectDomain, dmarcReportDomain: string | null = null) {
  return expectedRecords(
    { ...domain, mailFromDomain: `send.${domain.name}`, dmarcReportToken: "tok123" },
    dmarcReportDomain,
  );
}

const withStatus = (records: DomainRecord[], status: DomainRecord["status"]) =>
  records.map((record) => ({ ...record, status }));

/** A fake HTTP getter answering by URL; anything else is a 404. */
function fakeHttp(responses: Record<string, { status: number; body?: unknown }>) {
  const calls: string[] = [];
  const http: DomainConnectHttp = async (url) => {
    calls.push(url);
    const response = responses[url];
    if (!response) return { status: 404, body: "" };
    return { status: response.status, body: JSON.stringify(response.body ?? {}) };
  };
  return { http, calls };
}

const cloudflare = {
  "https://api.cloudflare.com/client/v4/dns/domainconnect/v2/example.com/settings": {
    status: 200,
    body: SETTINGS,
  },
  [`${SETTINGS.urlAPI}${TEMPLATE_PATH}`]: { status: 200, body: { version: 1 } },
};

describe("zoneCandidates", () => {
  test("walks up from the domain to its organizational domain", () => {
    expect(zoneCandidates("example.com")).toEqual(["example.com"]);
    expect(zoneCandidates("mail.eu.example.co.uk")).toEqual([
      "mail.eu.example.co.uk",
      "eu.example.co.uk",
      "example.co.uk",
    ]);
  });
});

describe("discoverDomainConnect", () => {
  const dns = fakeDnsResolver({
    "TXT _domainconnect.example.com": [["api.cloudflare.com/client/v4/dns/domainconnect"]],
  });

  test("finds the provider of the zone apex", async () => {
    const { http } = fakeHttp(cloudflare);
    expect(await discoverDomainConnect("example.com", { dns, http })).toEqual({
      zone: "example.com",
      host: "",
      providerId: "cloudflare.com",
      providerName: "Cloudflare",
      urlSyncUX: "https://dash.cloudflare.com/domainconnect",
    });
  });

  test("splits a subdomain into zone and host", async () => {
    const { http, calls } = fakeHttp(cloudflare);
    const provider = await discoverDomainConnect("mail.example.com", { dns, http });
    expect(provider).toMatchObject({ zone: "example.com", host: "mail" });
    // No `_domainconnect` at the subdomain: no request for it.
    expect(calls.some((url) => url.includes("mail.example.com"))).toBe(false);
  });

  test("moves to the parent when the provider doesn't host the name as a zone", async () => {
    const both = fakeDnsResolver({
      "TXT _domainconnect.mail.example.com": [["api.cloudflare.com/client/v4/dns/domainconnect"]],
      "TXT _domainconnect.example.com": [["api.cloudflare.com/client/v4/dns/domainconnect"]],
    });
    const { http } = fakeHttp(cloudflare);
    expect(await discoverDomainConnect("mail.example.com", { dns: both, http })).toMatchObject({
      zone: "example.com",
      host: "mail",
    });
  });

  test("is null without a usable record, settings, sync flow or template", async () => {
    const { http } = fakeHttp(cloudflare);
    expect(
      await discoverDomainConnect("example.com", { dns: fakeDnsResolver({}), http }),
    ).toBeNull();
    const bad = fakeDnsResolver({ "TXT _domainconnect.example.com": [["http://10.0.0.1/x?y"]] });
    expect(await discoverDomainConnect("example.com", { dns: bad, http })).toBeNull();

    const settingsUrl =
      "https://api.cloudflare.com/client/v4/dns/domainconnect/v2/example.com/settings";
    const variants: Record<string, { status: number; body?: unknown }>[] = [
      // No synchronous flow.
      {
        ...cloudflare,
        [settingsUrl]: { status: 200, body: { ...SETTINGS, urlSyncUX: undefined } },
      },
      // Not https.
      {
        ...cloudflare,
        [settingsUrl]: { status: 200, body: { ...SETTINGS, urlSyncUX: "http://dash.test" } },
      },
      // Template not onboarded.
      { [settingsUrl]: cloudflare[settingsUrl] as { status: number; body: unknown } },
      // Provider error.
      { ...cloudflare, [settingsUrl]: { status: 500 } },
    ];
    for (const responses of variants) {
      expect(
        await discoverDomainConnect("example.com", { dns, http: fakeHttp(responses).http }),
      ).toBeNull();
    }
  });

  test("is null on lookup and network failures", async () => {
    const failing = {
      resolveCname: async () => [],
      resolveMx: async () => [],
      resolveTxt: async () => {
        throw Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
      },
    };
    expect(
      await discoverDomainConnect("example.com", { dns: failing, http: fakeHttp({}).http }),
    ).toBeNull();
    const throwing: DomainConnectHttp = async () => {
      throw new Error("ECONNRESET");
    };
    expect(await discoverDomainConnect("example.com", { dns, http: throwing })).toBeNull();
  });
});

describe("domainConnectGroups", () => {
  const dns = fakeDnsResolver({});
  const tracking: DomainConnectTracking = {
    hostname: "links.example.com",
    status: "pending",
    record: { value: "track.cosslinks.com", status: "missing" },
  };

  test("adds every group a fresh domain lacks", async () => {
    const domain = domainOf("example.com");
    const records = withStatus(recordsOf(domain), "missing");
    expect(await domainConnectGroups({ domain, records, tracking }, dns)).toEqual([
      "dkim",
      "mail_from",
      "dmarc",
      "tracking",
    ]);
  });

  test("leaves out what is already verified", async () => {
    const domain = domainOf("example.com");
    const records = recordsOf(domain).map((record) => ({
      ...record,
      status: record.purpose === "mail_from_spf" ? ("mismatch" as const) : ("verified" as const),
    }));
    expect(await domainConnectGroups({ domain, records, tracking: null }, dns)).toEqual([
      "mail_from",
    ]);
  });

  test("never adds DMARC over an existing or inherited record", async () => {
    const domain = domainOf("mail.example.com");
    const records = recordsOf(domain).map((record) => ({
      ...record,
      status: record.purpose === "dmarc" ? ("mismatch" as const) : ("missing" as const),
    }));
    expect(await domainConnectGroups({ domain, records, tracking: null }, dns)).toEqual([
      "dkim",
      "mail_from",
    ]);
    const inherited = domainOf("mail.example.com", { dmarcInheritedRecord: "v=DMARC1; p=reject" });
    expect(
      await domainConnectGroups(
        { domain: inherited, records: withStatus(recordsOf(inherited), "missing"), tracking: null },
        dns,
      ),
    ).toEqual(["dkim", "mail_from"]);
  });

  test("asks DNS again when the stored check says DMARC is missing", async () => {
    const domain = domainOf("mail.example.com");
    const records = withStatus(recordsOf(domain), "missing");
    expect(await domainConnectGroups({ domain, records, tracking: null }, dns)).toContain("dmarc");
    // Published since the last check, at the name or the organizational domain.
    for (const name of ["mail.example.com", "example.com"]) {
      const published = fakeDnsResolver({ [`TXT _dmarc.${name}`]: [["v=DMARC1; p=reject"]] });
      expect(
        await domainConnectGroups({ domain, records, tracking: null }, published),
      ).not.toContain("dmarc");
    }
    const parentFails = {
      ...dns,
      resolveTxt: async (name: string) => {
        if (name === "_dmarc.example.com") {
          throw Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
        }
        return [];
      },
    };
    expect(
      await domainConnectGroups({ domain, records, tracking: null }, parentFails),
    ).not.toContain("dmarc");
  });

  test("looks DMARC up when the domain hasn't been checked yet", async () => {
    const domain = domainOf("mail.example.com");
    const records = recordsOf(domain);
    expect(await domainConnectGroups({ domain, records, tracking: null }, dns)).toContain("dmarc");
    const parent = fakeDnsResolver({ "TXT _dmarc.example.com": [["v=DMARC1; p=reject"]] });
    expect(await domainConnectGroups({ domain, records, tracking: null }, parent)).not.toContain(
      "dmarc",
    );
    const failing = {
      ...dns,
      resolveTxt: async () => {
        throw Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
      },
    };
    expect(await domainConnectGroups({ domain, records, tracking: null }, failing)).not.toContain(
      "dmarc",
    );
  });

  test("is empty for records the template doesn't write", async () => {
    for (const domain of [
      domainOf("example.com", { dkimHostedZone: "dkim.example-region.amazonses.com" }),
      domainOf("example.com", { dkimTokens: TOKENS.slice(0, 2) }),
    ]) {
      const records = withStatus(recordsOf(domain), "missing");
      expect(await domainConnectGroups({ domain, records, tracking: null }, dns)).toEqual([]);
    }
  });

  test("skips a tracking domain with another CNAME target or already verified", async () => {
    const domain = domainOf("example.com");
    const records = withStatus(recordsOf(domain), "verified");
    const other = { ...tracking, record: { value: "track.staging.test", status: "missing" } };
    const verified = { ...tracking, record: { ...tracking.record, status: "verified" } };
    for (const candidate of [other, verified, { ...tracking, status: "active" }]) {
      expect(await domainConnectGroups({ domain, records, tracking: candidate }, dns)).toEqual([]);
    }
  });
});

type TemplateRecord = (typeof DOMAIN_CONNECT_TEMPLATE.records)[number] & {
  pointsTo?: string;
  data?: string;
  spfRules?: string;
  priority?: number;
};

/** Applies the template as a DNS provider would (variables, then names relative to host + zone). */
function applyTemplate(
  provider: { zone: string; host: string },
  groups: readonly DomainConnectGroup[],
  variables: Record<string, string>,
) {
  const fqdn = provider.host ? `${provider.host}.${provider.zone}` : provider.zone;
  const fill = (value: string) =>
    value.replace(/%([a-z0-9_]+)%/gi, (_, name: string) => {
      const found = variables[name];
      if (found === undefined) throw new Error(`missing variable ${name}`);
      return found;
    });
  return (DOMAIN_CONNECT_TEMPLATE.records as TemplateRecord[])
    .filter((record) => groups.includes(record.groupId as DomainConnectGroup))
    .map((record) => {
      const name = record.host === "@" ? fqdn : `${fill(record.host)}.${fqdn}`;
      switch (record.type) {
        case "SPFM":
          return { type: "TXT", name, value: `v=spf1 ${record.spfRules} ~all`, priority: null };
        case "TXT":
          return { type: "TXT", name, value: fill(record.data ?? ""), priority: null };
        default:
          return {
            type: record.type,
            name,
            value: fill(record.pointsTo ?? ""),
            priority: record.priority ?? null,
          };
      }
    });
}

describe("the template", () => {
  test.each([
    ["example.com", "", null],
    ["mail.example.com", "mail", "inbound.coss.test"],
  ])("writes the records coss.com checks (%s)", async (name, host, dmarcReportDomain) => {
    const domain = domainOf(name);
    const records = withStatus(recordsOf(domain, dmarcReportDomain), "missing");
    const tracking: DomainConnectTracking = {
      hostname: `links.${name}`,
      status: "pending",
      record: { value: "track.cosslinks.com", status: "missing" },
    };
    const groups = await domainConnectGroups({ domain, records, tracking }, fakeDnsResolver({}));
    expect(groups).toEqual(["dkim", "mail_from", "dmarc", "tracking"]);
    const variables = domainConnectVariables({ domain, records, tracking }, groups);
    const written = applyTemplate({ zone: "example.com", host }, groups, variables);
    const expected = [
      ...records.map(({ type, name, value, priority }) => ({ type, name, value, priority })),
      { type: "CNAME", name: tracking.hostname, value: tracking.record.value, priority: null },
    ];
    expect(written).toEqual(expected);
  });

  test("re-applying a group replaces its records and keeps the other groups'", async () => {
    // A provider that keeps applied-template state adds groups applied later to the instance,
    // and on re-applying one removes that group's previous records on the same host, unless the
    // template is multiInstance (spec, "Apply, Re-apply, and Multi-Instance").
    const tracking: DomainConnectTracking = {
      hostname: "links.example.com",
      status: "pending",
      record: { value: "track.cosslinks.com", status: "missing" },
    };
    const applied = new Map<DomainConnectGroup, ReturnType<typeof applyTemplate>[]>();
    const apply = (domain: DomainConnectDomain, groups: DomainConnectGroup[]) => {
      const records = withStatus(recordsOf(domain), "missing");
      const variables = domainConnectVariables({ domain, records, tracking }, groups);
      for (const group of groups) {
        const { multiInstance } = DOMAIN_CONNECT_TEMPLATE as { multiInstance?: boolean };
        const previous = multiInstance ? (applied.get(group) ?? []) : [];
        const written = applyTemplate({ zone: "example.com", host: "" }, [group], variables);
        applied.set(group, [...previous, written]);
      }
    };
    apply(domainOf("example.com"), ["dkim", "mail_from"]);
    apply(domainOf("example.com"), ["tracking"]);
    // The domain was deleted and added again: SES issued new DKIM tokens.
    const readded = domainOf("example.com", { dkimTokens: ["dddd4444", "eeee5555", "ffff6666"] });
    apply(readded, ["dkim"]);
    const records = withStatus(recordsOf(readded), "missing");
    expect([...applied.values()].flat(2).map((record) => record.name)).toEqual([
      ...records.filter((record) => record.purpose !== "dmarc").map((record) => record.name),
      "links.example.com",
    ]);
  });

  test("has the fields DNS providers require", () => {
    expect(DOMAIN_CONNECT_TEMPLATE).toMatchObject({
      providerId: "coss.com",
      serviceId: "email",
      syncPubKeyDomain: "coss.com",
      syncBlock: false,
    });
    const groups = new Set(DOMAIN_CONNECT_TEMPLATE.records.map((record) => record.groupId));
    expect([...groups].sort()).toEqual(["dkim", "dmarc", "mail_from", "tracking"]);
    // Receiving MX records never belong in the template: they'd take over the domain's mail.
    expect(DOMAIN_CONNECT_TEMPLATE.records.filter((record) => record.type === "MX")).toEqual([
      expect.objectContaining({ host: "send" }),
    ]);
  });
});

describe("domainConnectApplyUrl", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const signer = { keyId: "_dck1", privateKey: parseDomainConnectKey(pem.replaceAll("\n", "\\n")) };
  const provider: DomainConnectProvider = {
    zone: "example.com",
    host: "mail",
    providerId: "cloudflare.com",
    providerName: "Cloudflare",
    urlSyncUX: "https://dash.cloudflare.com/domainconnect",
  };

  test("is signed over the query string without sig and key", () => {
    const url = new URL(
      domainConnectApplyUrl(
        {
          provider,
          groups: ["dkim", "dmarc"],
          variables: { dkim1: "a", dkim2: "b", dkim3: "c", dmarc: "v=DMARC1; p=none;" },
          redirectUri: "https://coss.com/acme/domains/dom_1?dns_connect=done",
          state: "dom_1",
        },
        signer,
      ),
    );
    expect(url.origin + url.pathname).toBe(
      `https://dash.cloudflare.com/domainconnect${TEMPLATE_PATH}/apply`,
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      domain: "example.com",
      host: "mail",
      groupId: "dkim,dmarc",
      dmarc: "v=DMARC1; p=none;",
      key: "_dck1",
    });
    const query = url.search.slice(1);
    const signed = query.slice(0, query.indexOf("&sig="));
    const sig = url.searchParams.get("sig") ?? "";
    expect(
      verify(
        "sha256",
        Buffer.from(signed),
        createPublicKey(privateKey),
        Buffer.from(sig, "base64"),
      ),
    ).toBe(true);
  });

  test("omits host at the zone apex", () => {
    const url = new URL(
      domainConnectApplyUrl(
        {
          provider: { ...provider, host: "" },
          groups: ["dkim"],
          variables: {},
          redirectUri: "https://coss.com/",
          state: "s",
        },
        signer,
      ),
    );
    expect(url.searchParams.has("host")).toBe(false);
  });

  test("publishes the public key in TXT-sized parts", () => {
    const records = domainConnectPublicKeyRecords(signer.privateKey);
    expect(records.length).toBeGreaterThan(1);
    records.forEach((record, index) => {
      expect(record.startsWith(`p=${index + 1},a=RS256,d=`)).toBe(true);
      expect(record.length).toBeLessThanOrEqual(255);
    });
    const der = records.map((record) => record.split(",d=")[1]).join("");
    const published = createPublicKey({
      key: Buffer.from(der, "base64"),
      format: "der",
      type: "spki",
    });
    expect(published.equals(createPublicKey(privateKey))).toBe(true);
  });

  test("refuses keys that aren't RSA", () => {
    const ec = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({
      type: "pkcs8",
      format: "pem",
    });
    expect(() => parseDomainConnectKey(ec.toString())).toThrow("RSA");
  });
});

describe("publicHttpGetter", () => {
  test("refuses private addresses", async () => {
    for (const address of ["10.0.0.1", "169.254.169.254", "127.0.0.1"]) {
      const get = publicHttpGetter({ resolve: async () => [{ address, family: 4 }] });
      await expect(get("https://dc.example.com/v2/example.com/settings")).rejects.toThrow(
        "non-public",
      );
    }
    await expect(publicHttpGetter()("https://127.0.0.1/settings")).rejects.toThrow("public");
    await expect(publicHttpGetter()("http://example.com/settings")).rejects.toThrow("https");
  });
});
