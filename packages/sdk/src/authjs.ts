/**
 * `coss/authjs`: an Auth.js (NextAuth.js v5, `@auth/core`) email provider that sends magic links
 * through coss.com.
 *
 * ```ts
 * import NextAuth from "next-auth";
 * import Coss from "coss/authjs";
 *
 * export const { handlers, auth } = NextAuth({
 *   adapter, // email sign-in needs a database adapter
 *   providers: [Coss({ from: "Acme <auth@acme.com>" })],
 * });
 * ```
 *
 * The API key is `apiKey`, else Auth.js's `AUTH_COSS_KEY`, else `COSS_API_KEY`. The types here
 * describe only what the provider reads, so the SDK has no dependency on Auth.js;
 * `test/integration-types.ts` checks them against `@auth/core`'s own.
 */

import type { Coss } from "./client.ts";
import { CossSendError, type IntegrationClientOptions, lazyClient } from "./core/integration.ts";
import { escapeHtml, sha256Hex } from "./core/mime.ts";

export { CossSendError } from "./core/integration.ts";

/** What Auth.js passes to `sendVerificationRequest` (the fields the provider reads). */
export interface CossVerificationRequestParams {
  /** The address to send the link to. */
  identifier: string;
  url: string;
  token: string;
  expires: Date;
  provider: { apiKey?: string; from?: string };
  theme: { brandColor?: string; buttonText?: string };
}

/** An email's content, as `render` returns it. */
export interface CossVerificationEmail {
  subject: string;
  html: string;
  text: string;
}

export interface CossProviderConfig extends IntegrationClientOptions {
  /** The sender, e.g. `"Acme <auth@acme.com>"`, on a domain verified in coss.com (live keys). */
  from?: string;
  /** How long a link is valid, in seconds. Default 24 hours. */
  maxAge?: number;
  /** Replace the default email (Auth.js's layout). */
  render?: (params: CossVerificationRequestParams & { host: string }) => CossVerificationEmail;
  /** Defaults to `"account"`. */
  category?: string;
  /** Provider id, default `"coss"` (also names the env variable: `AUTH_COSS_KEY`). */
  id?: string;
  /** Shown on Auth.js's sign-in page. Default `"Email"`. */
  name?: string;
}

/** The provider object Auth.js reads. */
export interface CossEmailProvider {
  id: string;
  type: "email";
  name: string;
  from?: string;
  maxAge: number;
  apiKey?: string;
  sendVerificationRequest: (params: CossVerificationRequestParams) => Promise<void>;
  /** What Auth.js merges over the provider (a type literal: Auth.js wants a `Record`). */
  options: { id?: string; name?: string; from?: string; maxAge?: number };
}

/**
 * An Auth.js email provider. Links go out with `category: "account"` and open and click tracking
 * off: click tracking would route the secret link through coss.com's redirect.
 */
export function CossProvider(config: CossProviderConfig = {}): CossEmailProvider {
  const clients = new Map<string, () => Coss>();
  const clientFor = (apiKey: string | undefined): Coss => {
    // Auth.js fills `provider.apiKey` from AUTH_COSS_KEY after this function ran, so the key is
    // only known per request; one client per key.
    const key = apiKey ?? config.apiKey ?? "";
    let client = clients.get(key);
    if (!client) {
      client = lazyClient("authjs", config, () => apiKey ?? config.apiKey);
      clients.set(key, client);
    }
    return client();
  };

  return {
    id: config.id ?? "coss",
    type: "email",
    name: config.name ?? "Email",
    from: config.from,
    maxAge: config.maxAge ?? 24 * 60 * 60,
    apiKey: config.apiKey,
    async sendVerificationRequest(params) {
      const from = params.provider.from ?? config.from;
      if (!from) {
        throw new Error('coss/authjs: set `from`, e.g. Coss({ from: "Acme <auth@acme.com>" }).');
      }
      const host = new URL(params.url).host;
      const email = (config.render ?? defaultEmail)({ ...params, host });
      const result = await clientFor(params.provider.apiKey).email.send(
        {
          from,
          to: params.identifier,
          subject: email.subject,
          html: email.html,
          text: email.text,
          category: config.category ?? "account",
          tracking: { opens: false, clicks: false },
        },
        // The token is unique per link: a retried callback sends once. Hashed, never sent as is.
        { idempotencyKey: `authjs_${await sha256Hex(params.token)}` },
      );
      if (result.error) throw new CossSendError(result.error);
    },
    // Auth.js deep-merges `options` over the provider; the client, `fetch` and `render` stay in
    // this closure instead of being copied around.
    options: { id: config.id, name: config.name, from: config.from, maxAge: config.maxAge },
  };
}

export default CossProvider;

/** Auth.js's own sign-in email, with the host's dots broken so clients don't link them. */
function defaultEmail({
  url,
  host,
  theme,
}: CossVerificationRequestParams & { host: string }): CossVerificationEmail {
  const escapedHost = escapeHtml(host).replace(/\./g, "&#8203;.");
  const brandColor = escapeHtml(theme.brandColor || "#346df1");
  const buttonText = escapeHtml(theme.buttonText || "#fff");
  const html = `<body style="background: #f9f9f9;">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: #fff; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        Sign in to <strong>${escapedHost}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${brandColor}"><a href="${escapeHtml(url)}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${brandColor}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: #444;">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`;
  return { subject: `Sign in to ${host}`, html, text: `Sign in to ${host}\n${url}\n\n` };
}
