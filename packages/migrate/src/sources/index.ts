import type { MigrationProvider, MigrationSource, SourceConfig, SourceOptions } from "../types.ts";
import type { SourceDeps } from "./deps.ts";
import { checkPostmarkKey, postmarkSource } from "./postmark.ts";
import { checkResendKey, resendSource } from "./resend.ts";
import { checkSendGridKey, sendgridSource } from "./sendgrid.ts";

export type { Downloader, SourceDeps } from "./deps.ts";

export function createSource(config: SourceConfig, deps: SourceDeps = {}): MigrationSource {
  switch (config.provider) {
    case "resend":
      return resendSource(config.apiKey, deps);
    case "sendgrid":
      return sendgridSource(config.apiKey, config.options, deps);
    case "postmark":
      return postmarkSource(config.apiKey, config.options, deps);
  }
}

export type CredentialCheck =
  | { ok: true; options: SourceOptions; account: string | null }
  /** A Postmark account token with several servers: one must be chosen. */
  | { ok: false; servers: { id: number; name: string }[] };

/** Checks a key with one or two cheap requests; throws `ProviderError` when it's refused. */
export async function checkCredentials(
  provider: MigrationProvider,
  apiKey: string,
  opts: { serverId?: number | undefined } = {},
  deps: SourceDeps = {},
): Promise<CredentialCheck> {
  switch (provider) {
    case "resend":
      await checkResendKey(apiKey, deps);
      return { ok: true, options: {}, account: null };
    case "sendgrid":
      return { ok: true, options: await checkSendGridKey(apiKey, deps), account: null };
    case "postmark": {
      const check = await checkPostmarkKey(apiKey, opts.serverId, deps);
      return "servers" in check
        ? { ok: false, servers: check.servers }
        : { ok: true, options: check.options, account: check.account };
    }
  }
}
