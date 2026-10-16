import type { Coss, Domain } from "coss";
import { z } from "zod";
import { failWith, ok, respond, run, unwrap } from "../result.ts";
import { compact, READ_ONLY, type ToolContext, WRITE } from "./shared.ts";

function domainSummary(domain: Domain): object {
  return compact({
    id: domain.id,
    name: domain.name,
    status: domain.status,
    can_send: domain.can_send,
    mail_from_status: domain.mail_from_status,
    records_needing_attention: domain.records
      .filter((r) => r.status !== "verified")
      .map((r) => `${r.purpose} (${r.type} ${r.name}): ${r.status}`),
    tracking: domain.tracking && {
      hostname: domain.tracking.hostname,
      status: domain.tracking.status,
    },
    receiving: domain.receiving && { hostname: domain.receiving.hostname },
    verified_at: domain.verified_at,
    last_checked_at: domain.last_checked_at,
  });
}

/** A domain by id, or by name (case-insensitive) when the argument isn't an id. */
async function resolveDomain(coss: Coss, idOrName: string): Promise<Domain | null> {
  if (idOrName.startsWith("dom_")) return unwrap(await coss.domains.get(idOrName));
  const name = idOrName.trim().toLowerCase();
  return unwrap(await coss.domains.list()).data.find((d) => d.name === name) ?? null;
}

const domainArg = z.string().describe("The domain's id (dom_…) or its name (acme.com).");

const RECORD_HELP =
  "Add each record in `records` at your DNS provider (name and value exactly as given; " +
  "`required: false` records are recommended), then call verify_domain. DNS changes can take a " +
  "while to be visible.";

export function registerDomainTools(ctx: ToolContext): void {
  const { server, coss } = ctx;

  server.registerTool(
    "list_domains",
    {
      title: "List sending domains",
      description:
        "The organization's sending domains with their verification status, whether each can " +
        "send, and the DNS records that aren't verified yet.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    () => respond(coss.domains.list(), (list) => ({ domains: list.data.map(domainSummary) })),
  );

  server.registerTool(
    "get_domain",
    {
      title: "Get a domain and its DNS records",
      description:
        "A sending domain with every DNS record it needs (DKIM, MAIL FROM MX and SPF, DMARC), " +
        "what coss.com found in DNS for each, and its tracking and receiving setup.",
      inputSchema: z.object({ domain: domainArg }),
      annotations: READ_ONLY,
    },
    ({ domain }) =>
      run(async () => {
        const found = await resolveDomain(coss, domain);
        if (!found) return failWith(`No domain "${domain}" in this organization.`);
        return ok({ domain: found, ...(found.can_send ? {} : { help: RECORD_HELP }) });
      }),
  );

  server.registerTool(
    "add_domain",
    {
      title: "Add a sending domain",
      description:
        "Adds a domain to send from and returns the DNS records to create for it. Sending from it " +
        "with a live key works once it is verified.",
      inputSchema: z.object({ name: z.string().describe("The domain, e.g. acme.com.") }),
      annotations: WRITE,
    },
    ({ name }) =>
      respond(coss.domains.create({ name }), (domain) => ({ domain, help: RECORD_HELP })),
  );

  server.registerTool(
    "verify_domain",
    {
      title: "Verify a domain now",
      description:
        "Checks a domain's DNS records now (instead of waiting for coss.com's periodic check) and " +
        "returns the result per record. It can only be checked once in a short while.",
      inputSchema: z.object({ domain: domainArg }),
      annotations: { ...WRITE, idempotentHint: true, openWorldHint: true },
    },
    ({ domain }) =>
      run(async () => {
        const found = await resolveDomain(coss, domain);
        if (!found) return failWith(`No domain "${domain}" in this organization.`);
        const verified = unwrap(await coss.domains.verify(found.id));
        return ok({ domain: verified, ...(verified.can_send ? {} : { help: RECORD_HELP }) });
      }),
  );
}
