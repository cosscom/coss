import type { ReceivedEmail } from "@coss/companion";
import { getReceivedEmail } from "@coss/email";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileReceived } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/received/[receivedId]">,
  ) => {
    const { receivedId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { email: ["read"] });
    const email = await getReceivedEmail({ ...scope, id: receivedId });
    if (!email) throw new MobileApiError(404, "not_found", "Email not found.");
    return toMobileReceived(email) satisfies ReceivedEmail;
  },
);
