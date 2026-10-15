import type { EnvironmentResponse } from "@coss/companion";
import { emailActivity } from "@coss/email";
import { mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileEnvironment } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

const ACTIVITY_DAYS = 14;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]">,
  ) => {
    const { project, environment, scope } = await requireMobileEnvironment(
      request,
      await ctx.params,
      { email: ["read"] },
    );
    const now = new Date();
    const { days, totals } = await emailActivity({
      ...scope,
      since: new Date(now.getTime() - (ACTIVITY_DAYS - 1) * 86_400_000),
      now,
    });
    const { trackedOpens, opened, trackedClicks, clicked, ...counts } = totals;
    return {
      project: { id: project.id, name: project.name, slug: project.slug },
      environment: toMobileEnvironment(environment),
      activity: {
        days,
        totals: {
          ...counts,
          tracked_opens: trackedOpens,
          opened,
          tracked_clicks: trackedClicks,
          clicked,
        },
      },
    } satisfies EnvironmentResponse;
  },
);
