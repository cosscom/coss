import { mobileRoute } from "@/lib/mobile-api";
import { changeBroadcast } from "../../change";

export const dynamic = "force-dynamic";

export const POST = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/broadcasts/[broadcastId]/resume">,
  ) => changeBroadcast(request, await ctx.params, "resume"),
);
