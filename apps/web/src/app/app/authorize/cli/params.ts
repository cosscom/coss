import { isAuthorizationState, isCodeChallenge, isLoopbackPort } from "@coss/auth/cli";

/**
 * What `coss login` opens: `code_challenge` + `state`, and either the `port` of its loopback
 * server or `mode=code` (no browser on that machine: the user copies a code into the terminal).
 */
export type CliAuthorizeParams = {
  codeChallenge: string;
  state: string;
  /** `null`: display-code mode. */
  port: number | null;
  /** The machine's name, for the key's name. */
  host: string;
};

function one(value: string | string[] | undefined | null): string {
  return typeof value === "string" ? value : "";
}

/** The machine's name as the CLI sent it: printable, short, never markup. */
function cleanHost(value: string): string {
  return value
    .replace(/[^A-Za-z0-9.\-_ ]/g, "")
    .trim()
    .slice(0, 40);
}

export function parseCliAuthorizeParams(search: {
  code_challenge?: string | string[] | null;
  state?: string | string[] | null;
  port?: string | string[] | null;
  mode?: string | string[] | null;
  host?: string | string[] | null;
}): CliAuthorizeParams | null {
  const codeChallenge = one(search.code_challenge);
  const state = one(search.state);
  if (!isCodeChallenge(codeChallenge) || !isAuthorizationState(state)) return null;
  const mode = one(search.mode);
  const portText = one(search.port);
  const port = /^\d{1,5}$/.test(portText) ? Number(portText) : Number.NaN;
  if (mode === "code") {
    if (portText) return null;
    return { codeChallenge, state, port: null, host: cleanHost(one(search.host)) };
  }
  if (mode || !isLoopbackPort(port)) return null;
  return { codeChallenge, state, port, host: cleanHost(one(search.host)) };
}

/** This page's own URL, to come back to after signing in. */
export function cliAuthorizePath(params: CliAuthorizeParams): string {
  const query = new URLSearchParams({ code_challenge: params.codeChallenge, state: params.state });
  if (params.port === null) query.set("mode", "code");
  else query.set("port", String(params.port));
  if (params.host) query.set("host", params.host);
  return `/app/authorize/cli?${query}`;
}
