import { API_KEY_PREFIX } from "@coss/auth/constants";
import { listBudgetHolds } from "@coss/billing";
import type { ApiKeysResponse } from "@coss/companion";
import { listEnvironmentApiKeys } from "@coss/tenancy";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileApiKey } from "@/lib/mobile-wire";
import { apiKeyPaused } from "@/lib/spend";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/api-keys">,
  ) => {
    const { scope, project, environment } = await requireMobileEnvironment(
      request,
      await ctx.params,
      { apiKey: ["read"] },
    );
    const live = environment.mode === "live";
    const [keys, holds] = await Promise.all([
      listEnvironmentApiKeys(scope),
      live ? listBudgetHolds(scope.organizationId) : [],
    ]);
    return {
      prefix: API_KEY_PREFIX[environment.mode],
      personal_keys: environment.personalKeys,
      data: keys.map((key) => toMobileApiKey(key, apiKeyPaused(holds, key, project.id))),
    } satisfies ApiKeysResponse;
  },
);
