import type { BroadcastResponse, MobileBroadcast } from "@coss/companion";
import {
  contactVariables,
  countRecipients,
  getAudience,
  getBroadcast,
  getMarketingSettingsRow,
  getSegment,
  listBroadcastEmails,
  propertyDefinitions,
} from "@coss/email";
import { BUCKETS } from "@coss/ratelimit";
import { planRules } from "@/lib/billing";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { toBroadcastEmail, toMobileBroadcast } from "../wire";

export const dynamic = "force-dynamic";

/** The plan's marketing rate, as the dashboard's editor shows it (broadcasts/editor-data.ts). */
async function planRate(organizationId: string): Promise<number> {
  const rules = await planRules(organizationId);
  const rule =
    rules["email.marketing.recipients.second"] ?? BUCKETS["email.marketing.recipients.second"];
  return Math.max(1, Math.floor((rule.limit * 1000) / rule.periodMs));
}

// The dashboard's broadcasts/[broadcastId]/page.tsx.
export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/broadcasts/[broadcastId]">,
  ) => {
    const { broadcastId, ...params } = await ctx.params;
    const context = await requireMobileEnvironment(request, params, { broadcast: ["read"] });
    const { scope } = context;
    const [broadcast, settings, definitions] = await Promise.all([
      getBroadcast(scope, broadcastId),
      getMarketingSettingsRow(scope),
      propertyDefinitions(scope),
    ]);
    if (!broadcast) throw new MobileApiError(404, "not_found", "Broadcast not found.");
    const draft = broadcast.status === "draft";
    const [audience, segment, rate, emails, estimate] = await Promise.all([
      broadcast.audience_id ? getAudience(scope, broadcast.audience_id) : null,
      broadcast.segment_id ? getSegment(scope, broadcast.segment_id) : null,
      planRate(scope.organizationId),
      draft ? null : listBroadcastEmails(scope, broadcast.id, { limit: 20 }),
      draft
        ? countRecipients(
            scope,
            broadcast.audience_id
              ? { audienceId: broadcast.audience_id }
              : { segmentId: broadcast.segment_id as string },
            { topic: broadcast.topic },
          ).catch(() => null)
        : null,
    ]);
    const target: MobileBroadcast["target"] = audience
      ? { type: "audience", id: audience.id, name: audience.name }
      : segment
        ? { type: "segment", id: segment.id, name: segment.name }
        : null;
    const fallbacks = contactVariables(
      { address: "", firstName: null, lastName: null, properties: {} },
      definitions,
    );
    return {
      broadcast: toMobileBroadcast(broadcast, {
        target,
        planRate: rate,
        reachEstimate: estimate,
        mailingAddress: settings?.mailingAddress ?? null,
        fallbacks,
      }),
      recent_emails: (emails?.data ?? []).map(toBroadcastEmail),
      can_send: context.can({ broadcast: ["send"] }),
      can_read_email: context.can({ email: ["read"] }),
    } satisfies BroadcastResponse;
  },
);
