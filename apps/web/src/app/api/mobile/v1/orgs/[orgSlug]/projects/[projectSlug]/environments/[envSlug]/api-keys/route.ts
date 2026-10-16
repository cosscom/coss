import { API_KEY_PREFIX } from "@coss/auth/constants";
import type { ApiKeysResponse } from "@coss/companion";
import { listEnvironmentApiKeys } from "@coss/tenancy";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileApiKey } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/api-keys">,
  ) => {
    const { scope, environment } = await requireMobileEnvironment(request, await ctx.params, {
      apiKey: ["read"],
    });
    const keys = await listEnvironmentApiKeys(scope);
    return {
      prefix: API_KEY_PREFIX[environment.mode],
      data: keys.map(toMobileApiKey),
    } satisfies ApiKeysResponse;
  },
);
