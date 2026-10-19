import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { configIsShared } from "../config.ts";
import { clientFor, describeEnvironment, resolveCredentials } from "../context.ts";
import { apiError } from "../errors.ts";

export const whoamiCommand: Command = defineCommand({
  name: "whoami",
  summary: "Show the API key in use and its environment",
  description: "Shows the API key the CLI uses, where it comes from, and its environment.",
  flags: {},
  run: whoami,
});

function describeAccess(key: { access: "full" | "restricted"; permissions: string[] }): string {
  if (key.access === "full") return "full";
  return `restricted: ${key.permissions.join(", ") || "nothing"}`;
}

async function whoami({ context }: CommandInput<Record<never, never>>): Promise<number> {
  const { io, out } = context;
  const credentials = await resolveCredentials(context);
  const { data, error } = await clientFor(io, credentials).environment.get();
  if (error) throw apiError("Couldn't check the API key", error);
  const source =
    credentials.source === "env" ? "COSS_API_KEY" : `profile "${credentials.profileName}"`;
  if (out.json) {
    out.data({ source, base_url: credentials.baseUrl, environment: data });
    return 0;
  }
  out.line(describeEnvironment(data));
  out.line(`  Key       ${data.api_key.name ?? "(unnamed)"} ${out.style("dim", data.api_key.id)}`);
  // Older APIs don't report it.
  if (data.api_key.access) out.line(`  Access    ${describeAccess(data.api_key)}`);
  out.line(`  From      ${source}`);
  out.line(`  API       ${credentials.baseUrl}`);
  out.line(`  Version   ${data.organization.api_version}`);
  if (credentials.source === "profile" && (await configIsShared(io))) {
    out.warn("Your config file is readable by other users: run `chmod 600` on it.");
  }
  return 0;
}
