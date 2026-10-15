import type { EmailResponse } from "@coss/companion";
import { getEmail, listEmailEvents } from "@coss/email";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileEmail, toMobileEmailEvent } from "@/lib/mobile-wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/emails/[emailId]">,
  ) => {
    const { emailId, ...params } = await ctx.params;
    const { scope, can } = await requireMobileEnvironment(request, params, { email: ["read"] });
    const [email, events] = await Promise.all([
      getEmail({ ...scope, id: emailId }),
      listEmailEvents({ ...scope, emailId }),
    ]);
    if (!email) throw new MobileApiError(404, "not_found", "Email not found.");
    return {
      email: toMobileEmail(email),
      events: (events?.events ?? []).map(toMobileEmailEvent),
      has_more_events: events?.hasMore ?? false,
      can_send: can({ email: ["send"] }),
    } satisfies EmailResponse;
  },
);
