import type { SegmentResponse } from "@coss/companion";
import {
  ContactError,
  getSegment,
  listContactPropertyRows,
  listTopicRows,
  previewSegmentContacts,
} from "@coss/email";
import { MobileApiError, mobileRoute, requireMobileEnvironment } from "@/lib/mobile-api";
import { listEveryAudience, toMobileSegmentItems } from "../../contacts/wire";

export const dynamic = "force-dynamic";

// The dashboard's segments/[segmentId]/page.tsx, with its "Preview matches" (segments/actions.ts)
// answered up front: the app has no builder to preview.
const SAMPLE_SIZE = 5;

export const GET = mobileRoute(
  async (
    request,
    ctx: RouteContext<"/api/mobile/v1/orgs/[orgSlug]/projects/[projectSlug]/environments/[envSlug]/segments/[segmentId]">,
  ) => {
    const { segmentId, ...params } = await ctx.params;
    const { scope } = await requireMobileEnvironment(request, params, { contact: ["read"] });
    const segment = await getSegment(scope, segmentId);
    if (!segment) throw new MobileApiError(404, "not_found", "Segment not found.");
    const [properties, audiences, topics, preview] = await Promise.all([
      listContactPropertyRows(scope),
      listEveryAudience(scope),
      listTopicRows(scope),
      previewSegmentContacts(scope, segment.filter, { limit: SAMPLE_SIZE }, { count: true }).catch(
        (error: unknown) => {
          // A filter that no longer compiles (`invalid_filter`) still shows its conditions.
          if (error instanceof ContactError) return null;
          throw error;
        },
      ),
    ]);
    return {
      segment: {
        id: segment.id,
        name: segment.name,
        match: segment.filter.match,
        conditions: toMobileSegmentItems(segment, {
          propertyTypes: new Map(properties.map((property) => [property.key, property.type])),
          audiences: new Map(audiences.map((audience) => [audience.id, audience.name])),
          topics: new Map(topics.map((topic) => [topic.key, topic.name])),
        }),
        created_at: segment.created_at,
        updated_at: segment.updated_at,
      },
      count: preview?.count ?? null,
      sample: preview?.data.map((contact) => contact.email) ?? [],
    } satisfies SegmentResponse;
  },
);
