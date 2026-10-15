import type { HookApplication, Page } from "@coss/companion";
import { pageHookApplications, searchHookApplications } from "@coss/hooks";
import { cursorParam, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/hooks">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      hook: ["read"],
    });
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200);
    const page = query
      ? {
          applications: await searchHookApplications({ ...scope, query, limit: 50 }),
          hasMore: false,
        }
      : await pageHookApplications({ ...scope, limit: 50, after: cursorParam(request) });
    return {
      data: page.applications.map((application) => ({
        id: application.id,
        uid: application.uid,
        name: application.name,
        created_at: application.createdAt.toISOString(),
      })),
      next_cursor: page.hasMore ? (page.applications.at(-1)?.id ?? null) : null,
    } satisfies Page<HookApplication>;
  },
);
