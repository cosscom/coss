import type { AudienceResponse } from "@coss/companion";
import { getAudience, listAudienceContacts } from "@coss/email";
import {
  cursorParam,
  MobileApiError,
  mobileRoute,
  requireMobileEnvironment,
} from "@/lib/mobile-api";
import { toMobileAudience } from "../../contacts/wire";

export const dynamic = "force-dynamic";

// The dashboard's audiences/[audienceId]/page.tsx.
const PAGE_SIZE = 50;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/audiences/[audienceId]">,
  ) => {
    const { audienceId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { contact: ["read"] });
    const audience = await getAudience(scope, audienceId);
    const members = audience
      ? await listAudienceContacts(scope, audience.id, {
          limit: PAGE_SIZE,
          after: cursorParam(request),
        })
      : null;
    if (!audience || !members) throw new MobileApiError(404, "not_found", "Audience not found.");
    return {
      audience: toMobileAudience(audience),
      members: {
        data: members.data.map((contact) => ({
          id: contact.id,
          email: contact.email,
          status: contact.status,
        })),
        next_cursor: members.has_more ? (members.data.at(-1)?.id ?? null) : null,
      },
    } satisfies AudienceResponse;
  },
);
