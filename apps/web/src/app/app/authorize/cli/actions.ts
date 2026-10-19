"use server";

import {
  CLI_CODE_TTL_MS,
  CLI_DISPLAY_CODE_TTL_MS,
  cliCallbackUrl,
  createCliAuthorizationCode,
} from "@coss/auth/cli";
import { API_KEY_NAME_MAX_LENGTH } from "@coss/auth/constants";
import { getEnvironment, keyCreationAllowed } from "@coss/tenancy";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { liveKeyRestriction } from "@/lib/live-keys";
import { requireOrgPermission } from "@/lib/session";
import { parseCliAuthorizeParams } from "./params";

export type CliAuthorizeResult =
  | { kind: "redirect"; url: string }
  | { kind: "code"; code: string; expiresAt: string };

/**
 * Approves `coss login` for one environment: a one-time code bound to the CLI's PKCE challenge,
 * redirected to its loopback server (or shown, to copy). The key itself is created when the CLI
 * exchanges the code (`/api/cli/v1/token`), which checks all of this again.
 */
export async function authorizeCli(
  _prev: ActionResult<CliAuthorizeResult> | null,
  formData: FormData,
): Promise<ActionResult<CliAuthorizeResult>> {
  return runAction(async () => {
    const params = parseCliAuthorizeParams({
      code_challenge: formString(formData, "code_challenge"),
      state: formString(formData, "state"),
      port: formString(formData, "port") || null,
      mode: formString(formData, "mode") || null,
    });
    if (!params) throw new ActionError("This sign-in link is invalid. Run `coss login` again.");
    const [orgSlug = "", projectSlug = "", envSlug = ""] = formString(
      formData,
      "environment",
    ).split("/");
    const context = await requireOrgPermission(orgSlug, { apiKey: ["create"] });
    const userId = context.session.user.id;
    if (context.session.session.impersonatedBy) {
      throw new ActionError("The CLI can't be signed in while impersonating a user.");
    }
    const found = await getEnvironment({
      organizationId: context.organization.id,
      projectSlug,
      envSlug,
    });
    if (!found) throw new ActionError("Environment not found.");
    // CLI keys are personal keys of whoever approves them.
    if (
      !keyCreationAllowed({
        role: context.member.role,
        environment: found.environment,
        ownerUserId: userId,
        creatorUserId: userId,
      })
    ) {
      throw new ActionError("You can't create API keys in this environment.");
    }
    if (found.environment.mode === "live") {
      const restriction = await liveKeyRestriction(context.session, context.organization.id);
      if (restriction) throw new ActionError(restriction);
    }
    const name = formString(formData, "name");
    if (!name || name.length > API_KEY_NAME_MAX_LENGTH) {
      throw new ActionError(`Name the key (at most ${API_KEY_NAME_MAX_LENGTH} characters).`);
    }
    const ttlMs = params.port === null ? CLI_DISPLAY_CODE_TTL_MS : CLI_CODE_TTL_MS;
    const now = new Date();
    const code = await createCliAuthorizationCode(
      {
        userId,
        organizationId: context.organization.id,
        organizationSlug: context.organization.slug,
        environmentId: found.environment.id,
        name,
        codeChallenge: params.codeChallenge,
        ssoProviderId: context.session.session.ssoProviderId ?? null,
      },
      { ttlMs, now },
    );
    if (params.port === null) {
      return { kind: "code", code, expiresAt: new Date(now.getTime() + ttlMs).toISOString() };
    }
    return { kind: "redirect", url: cliCallbackUrl(params.port, { code, state: params.state }) };
  });
}
