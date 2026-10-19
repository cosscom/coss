import type { Coss, Domain, DomainRecordStatus } from "coss";
import type { Flags } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { type Context, clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { apiError, CliError, UsageError } from "../errors.ts";
import type { Output, Style } from "../output.ts";
import { type Cell, table } from "../table.ts";

/** A record to publish, of the domain itself or of its tracking or receiving hostname. */
export type DnsRecord = {
  label: string;
  type: "CNAME" | "MX" | "TXT";
  name: string;
  value: string;
  priority: number | null;
  required: boolean;
  status: DomainRecordStatus;
  found: string[];
};

const PURPOSES: Record<string, string> = {
  dkim: "DKIM",
  mail_from_mx: "Bounces (MX)",
  mail_from_spf: "Bounces (SPF)",
  dmarc: "DMARC",
};

export function domainRecords(domain: Domain): DnsRecord[] {
  const records: DnsRecord[] = domain.records.map((record) => ({
    label: PURPOSES[record.purpose] ?? record.purpose,
    type: record.type,
    name: record.name,
    value: record.value,
    priority: record.priority,
    required: record.required,
    status: record.status,
    found: record.found,
  }));
  if (domain.tracking) {
    records.push({
      label: "Tracking",
      ...domain.tracking.record,
      priority: null,
      required: true,
    });
  }
  if (domain.receiving)
    records.push({ label: "Receiving", ...domain.receiving.record, required: true });
  return records;
}

/** One TXT value as quoted strings of at most 255 characters each (RFC 1035). */
function txtValue(value: string): string {
  const chunks = value.match(/.{1,255}/gs) ?? [""];
  return chunks.map((chunk) => `"${chunk.replace(/[\\"]/g, "\\$&")}"`).join(" ");
}

const absolute = (host: string) => (host.endsWith(".") ? host : `${host}.`);

/** Zone-file lines, to paste into a DNS provider that imports BIND files. */
export function bindRecords(domain: Domain): string[] {
  const records = domainRecords(domain);
  return [
    `; ${domain.name}: the DNS records coss.com needs`,
    ...records.map((record) => {
      const value =
        record.type === "TXT"
          ? txtValue(record.value)
          : record.type === "MX"
            ? `${record.priority ?? 10} ${absolute(record.value)}`
            : absolute(record.value);
      const note = record.required ? "" : " ; recommended";
      return `${absolute(record.name)}\t3600\tIN\t${record.type}\t${value}${note}`;
    }),
  ];
}

const STATUS_STYLE: Record<DomainRecordStatus, Style> = {
  verified: "green",
  missing: "red",
  mismatch: "red",
  not_checked: "dim",
};

const DOMAIN_STYLE: Record<Domain["status"], Style> = {
  verified: "green",
  pending: "yellow",
  temporary_failure: "yellow",
  failed: "red",
  deleting: "dim",
};

function recordTable(out: Output, domain: Domain, withStatus: boolean): string[] {
  const rows: Cell[][] = [
    [
      { text: "FOR", style: "dim" },
      { text: "TYPE", style: "dim" },
      { text: "NAME", style: "dim" },
      { text: "VALUE", style: "dim" },
      ...(withStatus ? [{ text: "STATUS", style: "dim" as const }] : []),
    ],
  ];
  for (const record of domainRecords(domain)) {
    const value = record.type === "MX" ? `${record.priority ?? 10} ${record.value}` : record.value;
    rows.push([
      record.required ? record.label : `${record.label} (recommended)`,
      record.type,
      record.name,
      value,
      ...(withStatus
        ? [{ text: record.status.replace("_", " "), style: STATUS_STYLE[record.status] }]
        : []),
    ]);
  }
  return table(rows, out).map((line) => `  ${line}`);
}

/** What DNS showed for records that don't match yet. */
function mismatches(out: Output, domain: Domain): string[] {
  return domainRecords(domain)
    .filter((record) => record.status === "mismatch" && record.found.length > 0)
    .map((record) =>
      // What DNS answered is anyone's text: no escape sequences reach the terminal.
      out.style(
        "dim",
        `  ${record.name} (${record.type}) is ${record.found.map((value) => printable(value)).join(", ")}`,
      ),
    );
}

function headline(out: Output, domain: Domain): string {
  const status = out.style(DOMAIN_STYLE[domain.status], domain.status.replace("_", " "));
  const send = domain.can_send
    ? out.style("green", "can send")
    : out.style("dim", "can't send yet");
  return `${out.style("bold", domain.name)}  ${status}  ${send}  ${out.style("dim", domain.id)}`;
}

function printDomain(out: Output, domain: Domain, format: string | undefined): void {
  if (out.json) {
    out.data(domain);
    return;
  }
  if (format === "bind") {
    for (const line of bindRecords(domain)) out.line(line);
    return;
  }
  out.line(headline(out, domain));
  out.line();
  for (const line of recordTable(out, domain, true)) out.line(line);
  for (const line of mismatches(out, domain)) out.line(line);
}

/** A domain by id (`dom_…`) or by name. */
export async function findDomain(coss: Coss, ref: string): Promise<Domain> {
  if (ref.startsWith("dom_")) {
    const { data, error } = await coss.domains.get(ref);
    if (error) throw apiError(`Couldn't read ${ref}`, error);
    return data;
  }
  const { data, error } = await coss.domains.list();
  if (error) throw apiError("Couldn't list the domains", error);
  const name = ref.trim().toLowerCase().replace(/\.$/, "");
  const domain = data.data.find((candidate) => candidate.name === name);
  if (!domain) {
    throw new CliError(
      `No domain "${ref}" in this organization. Add it with \`coss domains add ${ref}\`.`,
    );
  }
  return domain;
}

function onePositional(positionals: string[], what: string, command: string): string {
  const [value, ...extra] = positionals;
  if (value === undefined || extra.length > 0) {
    throw new UsageError(`Pass one ${what}: \`coss ${command} <${what}>\`.`);
  }
  return value;
}

const FORMAT = {
  type: "string",
  value: "<format>",
  choices: ["table", "bind"],
  description: "table (default), or bind: zone-file lines to import into a DNS provider",
} as const;

function checkedFormat(format: string | undefined): string | undefined {
  if (format !== undefined && format !== "table" && format !== "bind") {
    throw new UsageError(`--format takes table or bind; got "${format}".`);
  }
  return format;
}

async function client(context: Context) {
  return clientFor(context.io, await resolveCredentials(context));
}

export const domainsListCommand: Command = defineCommand({
  name: "domains list",
  summary: "List the organization's sending domains",
  description: "Lists the organization's sending domains with their status.",
  flags: { json: { type: "boolean", description: "One domain object per line" } },
  run: async ({ context }) => {
    const { out } = context;
    const coss = await client(context);
    const { data, error } = await coss.domains.list({ signal: context.io.signal });
    if (error) throw apiError("Couldn't list the domains", error);
    if (out.json) {
      for (const domain of data.data) out.data(domain);
      return 0;
    }
    if (data.data.length === 0) {
      out.info("No domains yet. Add one with `coss domains add <domain>`.");
      return 0;
    }
    const rows: Cell[][] = [
      [
        { text: "NAME", style: "dim" },
        { text: "STATUS", style: "dim" },
        { text: "SENDING", style: "dim" },
        { text: "ID", style: "dim" },
      ],
      ...data.data.map((domain): Cell[] => [
        domain.name,
        { text: domain.status.replace("_", " "), style: DOMAIN_STYLE[domain.status] },
        domain.can_send ? { text: "yes", style: "green" } : { text: "no", style: "dim" },
        { text: domain.id, style: "dim" },
      ]),
    ];
    for (const line of table(rows, out)) out.line(line);
    return 0;
  },
});

const ADD_FLAGS = {
  format: FORMAT,
  json: { type: "boolean", description: "Print the domain (with its records) as JSON" },
} as const satisfies Flags;

export const domainsAddCommand: Command = defineCommand({
  name: "domains add",
  summary: "Add a sending domain and print its DNS records",
  usage: "<domain> [options]",
  description:
    "Adds a domain to send from and prints the DNS records to publish at your DNS provider. " +
    "coss.com checks them in the background; `coss domains verify <domain> --wait` checks now " +
    "and follows the domain until it's verified.",
  flags: ADD_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof ADD_FLAGS>) => {
    const { out } = context;
    const name = onePositional(positionals, "domain", "domains add");
    const format = checkedFormat(values.format);
    const coss = await client(context);
    const { data, error } = await coss.domains.create({ name }, { signal: context.io.signal });
    if (error) throw apiError(`Couldn't add ${name}`, error);
    if (out.json || format === "bind") {
      printDomain(out, data, format);
      return 0;
    }
    out.line(
      `${out.style("green", "✔")} Added ${out.style("bold", data.name)}. Publish these records at your DNS provider:`,
    );
    out.line();
    for (const line of recordTable(out, data, false)) out.line(line);
    out.line();
    out.info(
      out.style(
        "dim",
        `Then run \`coss domains verify ${data.name} --wait\`. \`--format bind\` prints them as zone-file lines.`,
      ),
    );
    return 0;
  },
});

const GET_FLAGS = {
  format: FORMAT,
  json: { type: "boolean", description: "Print the domain as JSON" },
} as const satisfies Flags;

export const domainsGetCommand: Command = defineCommand({
  name: "domains get",
  summary: "Show a domain's DNS records and what the last check saw",
  usage: "<domain|id> [options]",
  description:
    "Shows a domain's status and each DNS record it needs, with what the last check saw " +
    "(verified, missing, or a value that doesn't match).",
  flags: GET_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof GET_FLAGS>) => {
    const ref = onePositional(positionals, "domain", "domains get");
    const format = checkedFormat(values.format);
    const domain = await findDomain(await client(context), ref);
    printDomain(context.out, domain, format);
    return 0;
  },
});

const VERIFY_FLAGS = {
  wait: {
    type: "boolean",
    description: "Keep checking until the domain is verified (or verification gives up)",
  },
  timeout: {
    type: "string",
    value: "<seconds>",
    description: "How long --wait waits (default 600)",
  },
  json: { type: "boolean", description: "Print the domain as JSON" },
} as const satisfies Flags;

/** How often `--wait` checks; the API refuses checks of one domain more often than every few seconds. */
const CHECK_INTERVAL_MS = 10_000;

function missing(domain: Domain): string {
  const records = domainRecords(domain).filter(
    (record) => record.required && record.status !== "verified",
  );
  return records.map((record) => `${record.label} (${record.name})`).join(", ");
}

export const domainsVerifyCommand: Command = defineCommand({
  name: "domains verify",
  summary: "Check a domain's DNS records now (--wait follows it)",
  usage: "<domain|id> [options]",
  description:
    "Checks the domain's DNS records now instead of waiting for the next background check. " +
    "With --wait it keeps checking until the domain is verified, showing which records are " +
    "still missing. A domain whose verification gave up (failed) starts over with fresh DKIM " +
    "records, which have to be published again.",
  flags: VERIFY_FLAGS,
  positionals: true,
  run: verify,
});

async function verify({
  values,
  positionals,
  context,
}: CommandInput<typeof VERIFY_FLAGS>): Promise<number> {
  const { io, out } = context;
  const ref = onePositional(positionals, "domain", "domains verify");
  const timeoutS = values.timeout === undefined ? 600 : Number(values.timeout);
  if (!Number.isFinite(timeoutS) || timeoutS <= 0) {
    throw new UsageError("--timeout takes a number of seconds.");
  }
  const credentials = await resolveCredentials(context);
  // Checks are throttled per domain: a refused one is simply read instead, never waited for.
  const coss = clientFor(io, credentials, { maxRetries: 0 });
  let domain = await findDomain(coss, ref);
  const restarting = domain.status === "failed";

  const check = async (): Promise<Domain> => {
    const { data, error } = await coss.domains.verify(domain.id, { signal: io.signal });
    if (!error) return data;
    if (error.code !== "domain_recently_checked")
      throw apiError(`Couldn't check ${domain.name}`, error);
    const read = await coss.domains.get(domain.id, { signal: io.signal });
    if (read.error) throw apiError(`Couldn't read ${domain.name}`, read.error);
    return read.data;
  };

  domain = await check();
  if (restarting) {
    out.warn(
      `Verification of ${domain.name} had given up; it started over with new DKIM records. Publish them:`,
    );
  }
  if (!values.wait || domain.status === "verified" || domain.status === "failed") {
    printDomain(out, domain, undefined);
    return domain.status === "failed" ? 1 : 0;
  }

  if (!out.json) {
    out.line(headline(out, domain));
    out.line();
    for (const line of recordTable(out, domain, true)) out.line(line);
    out.line();
    out.info(
      `Waiting for ${domain.name} to verify (DNS changes can take a while). Press Ctrl-C to stop.`,
    );
  }
  const deadline = io.now().getTime() + timeoutS * 1000;
  let reported = missing(domain);
  while (domain.status !== "verified" && domain.status !== "failed") {
    if (io.now().getTime() >= deadline) {
      if (out.json) out.data(domain);
      out.warn(
        `${domain.name} isn't verified yet${reported ? `: still missing ${reported}` : ""}. coss.com keeps checking in the background.`,
      );
      return 1;
    }
    await io.sleep(CHECK_INTERVAL_MS, io.signal);
    if (io.signal.aborted) return 130;
    try {
      domain = await check();
    } catch (error) {
      if (io.signal.aborted) return 130;
      throw error;
    }
    const now = missing(domain);
    if (now !== reported && !out.json && domain.status !== "verified") {
      out.info(now ? `Still missing: ${now}` : "Every record is there; waiting for the provider…");
      for (const line of mismatches(out, domain)) out.info(line);
    }
    reported = now;
  }
  if (out.json) out.data(domain);
  else if (domain.status === "verified") {
    out.line(`${out.style("green", "✔")} ${domain.name} is verified: live keys can send from it.`);
  }
  if (domain.status === "failed") {
    throw new CliError(
      `Verification of ${domain.name} gave up. Run \`coss domains verify ${domain.name}\` to start over with new DKIM records.`,
    );
  }
  return 0;
}
