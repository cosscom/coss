import type { Page, Suppression } from "@coss/companion";
import { listSuppressions } from "@coss/email";
import { ListSuppressionsQuery } from "@coss/email/schemas";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/suppressions">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      suppression: ["read"],
    });
    const address = new URL(request.url).searchParams.get("address")?.trim() || undefined;
    const query = ListSuppressionsQuery.safeParse({
      address,
      after: cursorParam(request),
      limit: 50,
    });
    if (!query.success) {
      throw new MobileApiError(400, "invalid_request", "Enter a full email address to search.");
    }
    const list = await listSuppressions(scope, query.data);
    return {
      data: list.data.map(({ id, address, scope, reason, email_id, created_at }) => ({
        id,
        address,
        scope,
        reason,
        email_id,
        created_at,
      })),
      next_cursor: list.has_more ? (list.data.at(-1)?.id ?? null) : null,
    } satisfies Page<Suppression>;
  },
);
