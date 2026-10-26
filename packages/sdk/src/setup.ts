/**
 * What an agent should do next with this API key. Pure: the CLI (`coss init`) and the MCP server
 * (`get_setup`) both fetch the lists and call this, so the answer is one shape.
 */
import type { CossResult } from "./core/errors.ts";

/** A from address a sandbox key can send with. Live keys need a verified domain instead. */
export const SANDBOX_FROM = "hello@example.com";

/** A recipient whose delivery the sandbox simulates, so `diagnose_email` has an event to explain. */
export const SIMULATOR_TO = "bounce@simulator.amazonses.com";

/** One DNS record that still blocks sending. */
export interface SetupDnsRecord {
  domain: string;
  type: string;
  name: string;
  value: string;
  status: string;
  required: boolean;
}

/** A webhook endpoint the key's environment already has. */
export interface SetupWebhookEndpoint {
  id: string;
  url: string;
  enabled: boolean;
}

/** The domain fields `describeSetup` reads. A full `Domain` is assignable to this. */
export interface SetupDomain {
  name: string;
  can_send: boolean;
  records: {
    type: string;
    name: string;
    value: string;
    status: string;
    required: boolean;
  }[];
}

/** What `describeSetup` needs. List failures stay out of here and arrive as `warning`. */
export interface SetupInput {
  mode: "sandbox" | "live" | "unknown";
  domains: SetupDomain[];
  webhookEndpoints: SetupWebhookEndpoint[];
  /** A list call failed. The report is still returned. */
  warning?: string;
}

/**
 * The setup answer: a from address that will succeed, DNS still missing, webhook endpoints, and
 * one `next` sentence.
 */
export interface SetupReport {
  mode: "sandbox" | "live" | "unknown";
  /** Sandbox: `hello@example.com`. Live: `hello@<verified domain>`, or `null` until one can send. */
  from: string | null;
  missing_dns: SetupDnsRecord[];
  webhook_endpoints: SetupWebhookEndpoint[];
  next: string;
  warning?: string;
}

/** The three reads `get_setup` and `coss init` make. Structural, so a `Coss` client satisfies it. */
export interface SetupClient {
  environment: {
    get: () => Promise<CossResult<{ mode: "live" | "sandbox" }>>;
  };
  domains: {
    list: () => Promise<CossResult<{ data: SetupDomain[] }>>;
  };
  webhookEndpoints: {
    list: () => Promise<CossResult<{ data: SetupWebhookEndpoint[] }>>;
  };
}

/** Required DNS records that are not verified, on domains that cannot send yet. */
function missingDns(domains: SetupDomain[]): SetupDnsRecord[] {
  const missing: SetupDnsRecord[] = [];
  for (const domain of domains) {
    if (domain.can_send) continue;
    for (const record of domain.records) {
      if (!record.required || record.status === "verified") continue;
      missing.push({
        domain: domain.name,
        type: record.type,
        name: record.name,
        value: record.value,
        status: record.status,
        required: record.required,
      });
    }
  }
  return missing;
}

function chooseFrom(mode: SetupInput["mode"], domains: SetupDomain[]): string | null {
  if (mode === "sandbox" || mode === "unknown") return SANDBOX_FROM;
  const ready = domains.find((domain) => domain.can_send);
  return ready ? `hello@${ready.name}` : null;
}

function listenNote(endpoints: SetupWebhookEndpoint[]): string {
  if (endpoints.length > 0) return "";
  return " No webhook endpoints yet: `npx coss-cli listen` forwards events to localhost.";
}

function nextAction(input: SetupInput, from: string | null, missing: SetupDnsRecord[]): string {
  const listen = listenNote(input.webhookEndpoints);
  if (input.mode === "sandbox" || input.mode === "unknown") {
    return (
      `Any from address works (example ${SANDBOX_FROM}). Send to ${SIMULATOR_TO} and run ` +
      `diagnose_email (or \`npx coss-cli emails diagnose\`).${listen}`
    );
  }
  if (from) return `Ready to send from ${from}.${listen}`;
  if (missing.length > 0) {
    const names = [...new Set(missing.map((record) => record.domain))].join(", ");
    return (
      `Publish the missing required DNS records for ${names}, then verify the domain. ` +
      `A production key is a dashboard step after a domain is verified.${listen}`
    );
  }
  return (
    "Add a sending domain and publish its DNS records. A production key is a dashboard step " +
    `after a domain is verified.${listen}`
  );
}

/** The setup report for one environment. Domain and endpoint list failures belong in `warning`. */
export function describeSetup(input: SetupInput): SetupReport {
  const missing = missingDns(input.domains);
  const from = chooseFrom(input.mode, input.domains);
  const report: SetupReport = {
    mode: input.mode,
    from,
    missing_dns: missing,
    webhook_endpoints: input.webhookEndpoints.map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      enabled: endpoint.enabled,
    })),
    next: nextAction(input, from, missing),
  };
  if (input.warning) report.warning = input.warning;
  return report;
}

/**
 * Reads the environment, the first page of domains and the first page of webhook endpoints, then
 * `describeSetup`. A failed read becomes `warning` and a sandbox-shaped `next` when the mode is
 * unknown; it does not throw.
 */
export async function fetchSetupReport(coss: SetupClient): Promise<SetupReport> {
  const environment = await coss.environment.get();
  if (environment.error) {
    return describeSetup({
      mode: "unknown",
      domains: [],
      webhookEndpoints: [],
      warning: `Couldn't read the environment (${environment.error.message}).`,
    });
  }
  const [domains, endpoints] = await Promise.all([
    coss.domains.list(),
    coss.webhookEndpoints.list(),
  ]);
  const warnings: string[] = [];
  if (domains.error) warnings.push(`Couldn't list domains (${domains.error.message}).`);
  if (endpoints.error) {
    warnings.push(`Couldn't list webhook endpoints (${endpoints.error.message}).`);
  }
  return describeSetup({
    mode: environment.data.mode,
    domains: domains.data?.data ?? [],
    webhookEndpoints: (endpoints.data?.data ?? []).map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      enabled: endpoint.enabled,
    })),
    ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
  });
}
