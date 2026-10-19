import type { SmsResponse } from "@coss/companion";
import { getSms, listSmsEvents, SmsError } from "@coss/sms";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toMobileSms, toMobileSmsEvent } from "../wire";

export const dynamic = "force-dynamic";

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/sms/[smsId]">,
  ) => {
    const { smsId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { sms: ["read"] });
    try {
      const [sms, events] = await Promise.all([
        getSms({ ...scope, smsId }),
        listSmsEvents({ ...scope, smsId }),
      ]);
      return {
        sms: toMobileSms(sms),
        events: events.map(toMobileSmsEvent),
      } satisfies SmsResponse;
    } catch (error) {
      if (error instanceof SmsError && error.code === "not_found") {
        throw new MobileApiError(404, "not_found", "SMS not found.");
      }
      throw error;
    }
  },
);
