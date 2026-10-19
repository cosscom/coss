import type { Coss, Environment } from "coss";
import type { Flags } from "../args.ts";
import { startLoopback } from "../auth/loopback.ts";
import { challengeFor, createState, createVerifier, verificationCode } from "../auth/pkce.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { configPath, type Profile, profileName, readConfig, writeConfig } from "../config.ts";
import {
  API_KEY_FORMAT,
  apiBaseUrl,
  type Context,
  clientFor,
  DEFAULT_BASE_URL,
  DEFAULT_DASHBOARD_URL,
  dashboardBaseUrl,
  describeEnvironment,
  savedApiBaseUrl,
} from "../context.ts";
import { apiError, CliError } from "../errors.ts";
import type { CliIo } from "../io.ts";

/** How long the browser has to send the code back. */
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

type TokenResponse = { api_key: string; api_key_id: string; name: string };

async function exchangeCode(
  io: CliIo,
  dashboardUrl: string,
  input: { code: string; codeVerifier: string },
): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await io.fetch(`${dashboardUrl}/api/cli/v1/token`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ code: input.code, code_verifier: input.codeVerifier }),
      signal: AbortSignal.any([io.signal, AbortSignal.timeout(30_000)]),
    });
  } catch (error) {
    throw new CliError(
      `Couldn't reach ${dashboardUrl}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const body = (await response.json().catch(() => null)) as
    | (TokenResponse & { error?: { code?: string; message?: string } })
    | null;
  if (!response.ok || !body || typeof body.api_key !== "string") {
    throw new CliError(`Sign-in failed: ${body?.error?.message ?? `HTTP ${response.status}`}`);
  }
  return body;
}

/** The browser flow: approval in the dashboard, a code back by loopback (or pasted), a new key. */
async function browserLogin(
  context: Context,
  dashboardUrl: string,
  options: { pasteCode: boolean },
): Promise<TokenResponse> {
  const { io, out } = context;
  const verifier = createVerifier();
  const challenge = challengeFor(verifier);
  const state = createState();
  const query = new URLSearchParams({ code_challenge: challenge, state, host: io.hostname() });

  if (options.pasteCode) {
    query.set("mode", "code");
    const url = `${dashboardUrl}/app/authorize/cli?${query}`;
    out.info(`Open this link in a browser where you're signed in to coss.com:\n\n  ${url}\n`);
    out.info(`Verification code: ${out.style("bold", verificationCode(challenge))}`);
    const code = await io.prompt("Paste the code it shows: ");
    if (!code) throw new CliError("No code entered.");
    return exchangeCode(io, dashboardUrl, { code, codeVerifier: verifier });
  }

  const loopback = await startLoopback();
  try {
    query.set("port", String(loopback.port));
    const url = `${dashboardUrl}/app/authorize/cli?${query}`;
    out.info(`Verification code: ${out.style("bold", verificationCode(challenge))}`);
    const opened = await io.openBrowser(url);
    out.info(
      opened
        ? `Opened the dashboard in your browser. If it didn't open, visit:\n\n  ${url}\n`
        : `Open this link in your browser:\n\n  ${url}\n`,
    );
    out.info("Waiting for you to approve…");
    const result = await loopback
      .wait(state, { timeoutMs: CALLBACK_TIMEOUT_MS, signal: io.signal })
      .catch((error: unknown) => {
        throw new CliError(error instanceof Error ? error.message : String(error));
      });
    if ("error" in result) throw new CliError("Sign-in was canceled in the browser.");
    return exchangeCode(io, dashboardUrl, { code: result.code, codeVerifier: verifier });
  } finally {
    await loopback.close();
  }
}

async function environmentOf(coss: Coss): Promise<Environment> {
  const { data, error } = await coss.environment.get();
  if (error) throw apiError("Couldn't check the API key", error);
  return data;
}

const FLAGS = {
  manual: {
    type: "boolean",
    description: "Paste an existing API key instead (from the dashboard, or piped on stdin)",
  },
  "no-browser": {
    type: "boolean",
    description:
      "Don't open a browser: open the link yourself, then paste the code it shows (the default " +
      "over SSH)",
  },
  profile: {
    type: "string",
    value: "<name>",
    description: 'Save under this profile name (default: "default")',
  },
} as const satisfies Flags;

export const loginCommand: Command = defineCommand({
  name: "login",
  summary: "Sign in (in the browser, or --manual with an API key)",
  description:
    "Signs the CLI in. Opens the dashboard, where you pick the environment the CLI works in; the " +
    "CLI gets a new API key of that environment (named after this machine), saved in your config.",
  flags: FLAGS,
  run: login,
});

async function login({ values, context }: CommandInput<typeof FLAGS>): Promise<number> {
  const { io, out, flags: global } = context;
  const config = await readConfig(io);
  const name = profileName(io, config, global.profile);
  const previous = config.profiles[name] ?? null;
  // Where this login points (a local stack, say) is remembered with the profile.
  const baseUrl = apiBaseUrl(io, null);
  const dashboardUrl = dashboardBaseUrl(io, null);

  let apiKey: string;
  let login: Profile["login"];
  if (values.manual) {
    apiKey = (await io.prompt("API key (coss_test_… or coss_live_…): ", { secret: true })).trim();
    if (!API_KEY_FORMAT.test(apiKey)) {
      throw new CliError("That isn't a coss.com API key (coss_test_… or coss_live_…).");
    }
    login = "manual";
  } else {
    const remote = Boolean(io.env.SSH_CONNECTION || io.env.SSH_TTY);
    const token = await browserLogin(context, dashboardUrl, {
      pasteCode: values["no-browser"] === true || remote,
    });
    apiKey = token.api_key;
    login = "browser";
  }

  const coss = clientFor(io, { apiKey, baseUrl });
  const environment = await environmentOf(coss);
  // A key the CLI created for this profile before is replaced: revoke it (best effort).
  if (previous?.login === "browser" && previous.api_key !== apiKey) {
    await clientFor(io, { apiKey: previous.api_key, baseUrl: savedApiBaseUrl(previous) })
      .apiKey.revoke()
      .catch(() => undefined);
  }

  config.profiles[name] = {
    api_key: apiKey,
    api_key_id: environment.api_key.id,
    login,
    ...(baseUrl !== DEFAULT_BASE_URL && { base_url: baseUrl }),
    ...(dashboardUrl !== DEFAULT_DASHBOARD_URL && { dashboard_url: dashboardUrl }),
    organization: environment.organization,
    project: environment.project,
    environment: {
      id: environment.id,
      name: environment.name,
      slug: environment.slug,
      mode: environment.mode,
    },
    // The listen secret belongs to the environment: keep it when signing in to the same one.
    ...(previous?.listen_secret &&
      previous.environment?.id === environment.id && { listen_secret: previous.listen_secret }),
    created_at: io.now().toISOString(),
  };
  config.default_profile ??= name;
  await writeConfig(io, config);

  if (out.json) {
    out.data({ profile: name, environment });
  } else {
    out.line(`${out.style("green", "✔")} Signed in to ${describeEnvironment(environment)}.`);
    out.line(
      `  Key ${environment.api_key.name ?? environment.api_key.id} saved as profile "${name}" in ${configPath(io)}.`,
    );
  }
  return 0;
}
