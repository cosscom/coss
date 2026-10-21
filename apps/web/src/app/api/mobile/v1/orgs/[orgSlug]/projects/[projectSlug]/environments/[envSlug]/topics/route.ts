import type { TopicsResponse } from "@coss/companion";
import { listTopicRows } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileTopic } from "../contacts/wire";

export const dynamic = "force-dynamic";

// The dashboard's topics/page.tsx (every topic, in preference-center order).
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/topics">,
  ) => {
    const { scope } = await requireMobileEnvironment(request, await ctx.params, {
      contact: ["read"],
    });
    const topics = await listTopicRows(scope);
    return { data: topics.map(toMobileTopic) } satisfies TopicsResponse;
  },
);
