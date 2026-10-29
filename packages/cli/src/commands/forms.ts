/** `coss forms …`: the environment's forms and their submissions, on the public API. */
import type { Coss, FormSubmissionStatus } from "coss";
import { type Flags, requireArgs } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { type Context, clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { apiError, UsageError } from "../errors.ts";
import type { Style } from "../output.ts";
import { table } from "../table.ts";

const STATUSES: readonly FormSubmissionStatus[] = [
  "accepted",
  "held",
  "spam",
  "pending_confirmation",
];

const LIMIT = {
  type: "string",
  value: "<n>",
  description: "How many to show, 1-100 (default 20)",
} as const;

async function formsClient(context: Context): Promise<Coss> {
  return clientFor(context.io, await resolveCredentials(context));
}

function limitOf(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new UsageError("--limit takes a number from 1 to 100.");
  }
  return limit;
}

function when(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

function statusStyle(status: FormSubmissionStatus): Style {
  return status === "accepted" ? "green" : status === "spam" ? "red" : "yellow";
}

const LIST_FLAGS = {
  limit: LIMIT,
  json: { type: "boolean", description: "One form per line, as JSON" },
} as const satisfies Flags;

const list: Command = defineCommand({
  name: "forms list",
  summary: "List forms",
  description: "Lists the environment's forms, newest first, with the endpoint each posts to.",
  flags: LIST_FLAGS,
  run: async ({ values, context }: CommandInput<typeof LIST_FLAGS>) => {
    const coss = await formsClient(context);
    const { data, error } = await coss.forms.list({
      ...(values.limit !== undefined && { limit: limitOf(values.limit) }),
    });
    if (error) throw apiError("Couldn't list the forms", error);
    const { out } = context;
    if (out.json) {
      for (const item of data.data) out.data(item);
      return 0;
    }
    if (data.data.length === 0) {
      out.info("No forms.");
      return 0;
    }
    const lines = table([
      ["ID", "NAME", "ENABLED", "ENDPOINT"],
      ...data.data.map((item) => [
        item.id,
        printable(item.name),
        item.enabled && !item.disabled_by_admin ? "yes" : out.style("yellow", "no"),
        item.endpoint,
      ]),
    ]);
    out.line(out.style("dim", lines[0] ?? ""));
    for (const line of lines.slice(1)) out.line(line);
    return 0;
  },
});

const SUBMISSIONS_FLAGS = {
  status: {
    type: "string",
    value: "<status>",
    choices: STATUSES,
    description: "Only this status: accepted, held, spam or pending_confirmation",
  },
  limit: LIMIT,
  json: { type: "boolean", description: "One submission per line, as JSON" },
} as const satisfies Flags;

const submissions: Command = defineCommand({
  name: "forms submissions",
  summary: "List a form's submissions (--status held: Risk's review queue)",
  usage: "<form> [--status <status>]",
  description:
    "Lists a form's submissions, newest first. Their values are what someone typed into the form.",
  flags: SUBMISSIONS_FLAGS,
  positionals: true,
  run: async ({ values, positionals, context }: CommandInput<typeof SUBMISSIONS_FLAGS>) => {
    const [formId] = requireArgs(positionals, 1, "forms submissions <form>") as [string];
    const status = values.status;
    if (status !== undefined && !(STATUSES as readonly string[]).includes(status)) {
      throw new UsageError(`--status takes ${STATUSES.join(", ")}; got "${status}".`);
    }
    const coss = await formsClient(context);
    const { data, error } = await coss.forms.submissions.list(formId, {
      ...(status !== undefined && { status: [status as FormSubmissionStatus] }),
      ...(values.limit !== undefined && { limit: limitOf(values.limit) }),
    });
    if (error) throw apiError("Couldn't list the submissions", error);
    const { out } = context;
    if (out.json) {
      for (const item of data.data) out.data(item);
      return 0;
    }
    if (data.data.length === 0) {
      out.info("No submissions.");
      return 0;
    }
    const lines = table([
      ["ID", "STATUS", "FROM", "FIELDS", "RECEIVED"],
      ...data.data.map((item) => [
        item.id,
        out.style(statusStyle(item.status), item.status),
        // What a submitter typed: never escape sequences.
        printable(item.submitter_email ?? ""),
        printable(Object.keys(item.data).join(", ")),
        when(item.created_at),
      ]),
    ]);
    out.line(out.style("dim", lines[0] ?? ""));
    for (const line of lines.slice(1)) out.line(line);
    if (data.has_more) {
      out.info(
        out.style(
          "dim",
          `There are more: \`coss api forms/${formId}/submissions --paginate\` lists them all.`,
        ),
      );
    }
    return 0;
  },
});

export const FORMS_COMMANDS: readonly Command[] = [list, submissions];
